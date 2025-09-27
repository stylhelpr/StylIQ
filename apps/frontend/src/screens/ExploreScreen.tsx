import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

import FeaturedHero from '../components/FashionFeed/FeaturedHero';
import ArticleCard from '../components/FashionFeed/ArticleCard';
import TrendChips from '../components/FashionFeed/TrendChips';
import ReaderModal from '../components/FashionFeed/ReaderModal';
import {useFashionFeeds} from '../hooks/useFashionFeeds';
import {useFeedSources, FeedSource} from '../hooks/useFeedSources';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {initializeNotifications} from '../utils/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {useAppTheme} from '../context/ThemeContext';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import {addNotification} from '../storage/notifications';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {TooltipBubble} from '../components/ToolTip/ToolTip1';

type Tab = 'For You' | 'Following';

type Chip = {
  id: string;
  label: string;
  type: 'personal' | 'trending' | 'context' | 'source';
  filter: {topics?: string[]; sources?: string[]; constraints?: any};
};

const triggerSelection = () =>
  ReactNativeHapticFeedback.trigger('selection', {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function ExploreScreen() {
  const userId = useUUID() ?? '';

  const {
    sources,
    enabled,
    loading: sourcesLoading,
    addSource,
    toggleSource,
    removeSource,
    renameSource,
    resetToDefaults,
  } = useFeedSources({userId});

  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: theme.colors.background},
    sourceUrl: {color: theme.colors.foreground, fontSize: 12, maxWidth: 240},
    removeBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
    },
    removeText: {
      color: theme.colors.foreground,
      fontWeight: '700',
      fontSize: 12,
    },
    addBox: {padding: 16, gap: 8},
    addTitle: {
      color: theme.colors.foreground,
      fontWeight: '800',
      fontSize: 16,
      marginBottom: 12,
    },
    addError: {color: theme.colors.error, fontSize: 12, marginBottom: 2},
    addBtn: {
      marginTop: 8,
      backgroundColor: theme.colors.button1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    addBtnText: {color: theme.colors.foreground, fontWeight: '800'},
    resetBtn: {
      marginTop: 8,
      backgroundColor: theme.colors.surface2,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      borderColor: theme.colors.surfaceBorder,
      borderWidth: theme.borderWidth.xl,
    },
    resetText: {color: theme.colors.foreground, fontWeight: '700'},
    topBar: {
      paddingTop: 14,
      paddingHorizontal: 16,
      paddingBottom: 6,
      backgroundColor: theme.colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconBtn: {
      // marginLeft: 16,
      width: 100,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.button1,
    },
    iconBtnText: {
      color: theme.colors.foreground,
      fontWeight: '600',
      fontSize: 11,
      lineHeight: 20,
      marginTop: -2,
      textAlign: 'center',
    },
    menuBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
    },
    menuSheet: {
      marginTop: 230,
      marginRight: 14,
      width: 200,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingVertical: 8,
      borderWidth: tokens.borderWidth.md,
      borderColor: theme.colors.surfaceBorder,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: {width: 0, height: 8},
      elevation: 8,
    },
    menuTitle: {
      color: theme.colors.foreground,
      fontSize: 12,
      fontWeight: '700',
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    menuItem: {
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    menuItemText: {
      color: theme.colors.foreground,
      fontWeight: '700',
    },
    manageBtn: {
      marginLeft: 'auto',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(89, 0, 255, 1)',
    },
    manageText: {color: theme.colors.foreground, fontWeight: '700'},
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.background,
    },
    sectionTitle: {
      color: theme.colors.button1,
      fontWeight: '800',
      fontSize: 20,
    },
    modalRoot: {
      flex: 1,
      backgroundColor: theme.colors.background,
      marginTop: 80,
    },
    modalHeader: {
      height: 48,
      borderBottomColor: 'rgba(255,255,255,0.1)',
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      color: theme.colors.foreground,
      fontWeight: '800',
      fontSize: 18,
    },
    done: {color: theme.colors.button1, fontWeight: '700'},
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomColor: 'rgba(255,255,255,0.06)',
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sourceName: {
      color: theme.colors.foreground,
      fontSize: 16,
      fontWeight: '700',
      padding: 0,
      marginBottom: 2,
    },
    input: {
      backgroundColor: theme.colors.surface3,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.foreground,
      marginBottom: 8,
    },
    rowToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(255,255,255,0.06)',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
    },
    rowToggleLabel: {
      color: theme.colors.foreground,
      fontSize: 14,
      fontWeight: '700',
    },
  });

  function RowToggle({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) {
    return (
      <View style={styles.rowToggle}>
        <Text style={styles.rowToggleLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={v => {
            ReactNativeHapticFeedback.trigger('selection', {
              enableVibrateFallback: true,
              ignoreAndroidSystemSettings: false,
            });
            onChange(v);
          }}
          trackColor={{false: 'rgba(255,255,255,0.18)', true: '#0A84FF'}}
          thumbColor="#fff"
        />
      </View>
    );
  }

  // ───────── Tabs control which feeds we pull ─────────
  const [tab, setTab] = useState<Tab>('For You');
  const feedsForTab = tab === 'Following' ? enabled : sources;

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const {articles, loading, refresh} = useFashionFeeds(
    feedsForTab.map(fs => ({name: fs.name, url: fs.url})),
    {userId},
  );

  // ───────── Notifications: follows + preferences ─────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [pushEnabled, setPushEnabled] = useState(true);
  const [followingRealtime, setFollowingRealtime] = useState(false);
  const [brandsRealtime, setBrandsRealtime] = useState(false);
  const [breakingRealtime, setBreakingRealtime] = useState(true);
  const [digestHour, setDigestHour] = useState<number>(8);
  const [prefsLoaded, setPrefsLoaded] = useState(false); // gate init

  // === OPEN FROM NOTIFICATION -> open Reader ===
  const [openUrl, setOpenUrl] = useState<string | undefined>();
  const [openTitle, setOpenTitle] = useState<string | undefined>();
  const openFromNotification = (data: any) => {
    if (!data) return;
    if (data.type === 'article' && data.url) {
      setTab('For You');
      setOpenUrl(data.url);
      setOpenTitle(data.title || data.source || '');
    }
    if (data.type === 'test') {
      setTab('For You');
    }
  };

  const sendLocalTestNotification = async () => {
    const title = 'Inbox test';
    const message = 'This should appear in Notifications.';
    const deeplink = 'myapp://news/123'; // optional

    // save to your in-app inbox (what the Notifications screen reads)
    await addNotification(userId, {
      title,
      message,
      deeplink,
      category: 'news',
      data: {type: 'test'},
    });

    // (optional) show an OS banner so you also see a toast
    try {
      PushNotification.localNotification({
        channelId: 'style-channel',
        title,
        message,
        playSound: true,
        soundName: 'default',
      });
    } catch {}
  };

  // Listeners to handle push taps / foreground messages
  useEffect(() => {
    // App in background → user taps the push
    const unsubOpened = messaging().onNotificationOpenedApp(msg => {
      if (msg?.data) openFromNotification(msg.data);
    });

    // App was quit → opened from a push
    messaging()
      .getInitialNotification()
      .then(msg => {
        if (msg?.data) openFromNotification(msg.data);
      });

    // App in foreground → play chime via local notification (+ optional prompt)
    const unsubForeground = messaging().onMessage(async msg => {
      const d = msg?.data || {};

      // Make a local notification so iOS/Android will play a sound in-foreground
      try {
        PushNotification.localNotification({
          channelId: 'style-channel', // must match created channel
          title: msg.notification?.title ?? d.source ?? 'Fashion Feed',
          message: msg.notification?.body ?? d.title ?? 'New article',
          playSound: true,
          soundName: 'default',
          userInfo: d, // if you later handle taps via PushNotification.configure
        });
      } catch (e) {
        console.log('⚠️ localNotification error', e);
      }

      // Optional: keep the in-app prompt so users can open immediately
      if (d?.type === 'article' && d?.url) {
        Alert.alert(
          msg.notification?.title ?? 'Fashion Feed',
          msg.notification?.body ?? 'New article',
          [
            {text: 'Later', style: 'cancel'},
            {text: 'Read now', onPress: () => openFromNotification(d)},
          ],
        );
      }
    });

    return () => {
      unsubOpened();
      unsubForeground();
    };
  }, []);

  // Register once, only after prefs loaded and push is ON
  useEffect(() => {
    (async () => {
      if (!userId || !prefsLoaded) return;
      await AsyncStorage.setItem(
        'notificationsEnabled',
        pushEnabled ? 'true' : 'false',
      );
      if (pushEnabled) {
        await initializeNotifications(userId); // requests perms, gets token, registers
        console.log('✅ Push initialized & token registration attempted');
      } else {
        console.log('🔕 Push disabled locally');
      }
    })();
  }, [userId, prefsLoaded, pushEnabled]);

  // Load follows
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/notifications/follows?user_id=${encodeURIComponent(
            userId,
          )}`,
        );
        const json = await res.json();
        const list: string[] = Array.isArray(json?.sources) ? json.sources : [];
        setFollowingSet(new Set(list.map(s => s.toLowerCase())));
      } catch (e) {
        console.log('⚠️ load follows failed', e);
      }
    })();
  }, [userId]);

  // Load preferences (and mirror the local flag so initialize can run)
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/notifications/preferences/get?user_id=${encodeURIComponent(
            userId,
          )}`,
        ).catch(() => null);

        const json =
          (await res?.json().catch(() => null)) ??
          (await (
            await fetch(`${API_BASE_URL}/notifications/preferences`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({user_id: userId}),
            })
          ).json());

        if (json) {
          const pe = json.push_enabled ?? true;
          setPushEnabled(pe);
          setFollowingRealtime(json.following_realtime ?? false);
          setBrandsRealtime(json.brands_realtime ?? false);
          setBreakingRealtime(json.breaking_realtime ?? true);
          setDigestHour(Number(json.digest_hour ?? 8));

          await AsyncStorage.setItem(
            'notificationsEnabled',
            pe ? 'true' : 'false',
          );
        }
      } catch (e) {
        console.log('⚠️ load prefs failed', e);
      } finally {
        setPrefsLoaded(true); // allow init effect to run
      }
    })();
  }, [userId]);

  const savePrefs = async (
    overrides?: Partial<{
      push_enabled: boolean;
      following_realtime: boolean;
      brands_realtime: boolean;
      breaking_realtime: boolean;
      digest_hour: number;
    }>,
  ) => {
    try {
      const payload = {
        user_id: userId,
        push_enabled: pushEnabled,
        following_realtime: followingRealtime,
        brands_realtime: brandsRealtime,
        breaking_realtime: breakingRealtime,
        digest_hour: digestHour,
        ...(overrides ?? {}),
      };
      await fetch(`${API_BASE_URL}/notifications/preferences`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.log('⚠️ save prefs failed', e);
    }
  };

  const followSource = async (name: string) => {
    const key = name.toLowerCase();
    setFollowingSet(prev => new Set([...prev, key])); // optimistic
    try {
      await fetch(`${API_BASE_URL}/notifications/follow`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({user_id: userId, source: name}),
      });
    } catch (e) {
      // revert on error
      setFollowingSet(prev => {
        const copy = new Set(prev);
        copy.delete(key);
        return copy;
      });
    }
  };

  const unfollowSource = async (name: string) => {
    const key = name.toLowerCase();
    setFollowingSet(prev => {
      const copy = new Set(prev);
      copy.delete(key);
      return copy;
    }); // optimistic
    try {
      await fetch(`${API_BASE_URL}/notifications/unfollow`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({user_id: userId, source: name}),
      });
    } catch (e) {
      // revert on error
      setFollowingSet(prev => new Set([...prev, key]));
    }
  };

  // ───────── Personal chips (from style_profiles.preferred_brands) ─────────
  const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/style-profile/${userId}/brands`,
        );
        const json = await res.json();
        console.log('👗 Preferred brands:', json);
        setWardrobeBrands(Array.isArray(json.brands) ? json.brands : []);
      } catch (err) {
        console.error('❌ Failed to fetch preferred brands:', err);
        setWardrobeBrands([]);
      }
    })();
  }, [userId]);

  // ───────── Trending chips ─────────
  const trendingKeywords = useMemo(() => {
    if (!articles?.length) return [];
    const wordCounts: Record<string, number> = {};
    for (const a of articles) {
      const text = `${a.title ?? ''} ${a.summary ?? ''}`.toLowerCase();
      text.split(/\W+/).forEach(w => {
        if (w.length > 3) wordCounts[w] = (wordCounts[w] ?? 0) + 1;
      });
    }
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([w]) => w)
      .slice(0, 10);
  }, [articles]);

  // ───────── Context chips ─────────
  const [weather, setWeather] = useState('hot');
  useEffect(() => {
    setWeather('hot'); // placeholder; swap with real weather call
  }, []);

  // ───────── User-controlled feed order (persisted) ─────────
  const ORDER_KEY = (uid: string) => `feed_source_order.v1:${uid}`;
  const [sourceOrder, setSourceOrder] = useState<Record<string, number>>({});

  const keyFor = (name: string) => name.trim().toLowerCase();

  function sortSources<T extends {name: string}>(
    list: T[],
    orderMap: Record<string, number>,
  ): T[] {
    return [...list].sort((a, b) => {
      const ra = orderMap[keyFor(a.name)] ?? Number.POSITIVE_INFINITY;
      const rb = orderMap[keyFor(b.name)] ?? Number.POSITIVE_INFINITY;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  }

  // Load saved order
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ORDER_KEY(userId));
        if (raw) setSourceOrder(JSON.parse(raw));
      } catch {}
    })();
  }, [userId]);

  // Sync order map with source list (append new sources at end A→Z)
  useEffect(() => {
    if (!sources?.length) return;
    const orderedExisting = sortSources(sources, sourceOrder).map(s =>
      keyFor(s.name),
    );
    const known = new Set(Object.keys(sourceOrder));
    const newOnes = sources
      .map(s => keyFor(s.name))
      .filter(k => !known.has(k))
      .sort((a, b) => a.localeCompare(b));

    const finalSeq = [...orderedExisting, ...newOnes];
    const next: Record<string, number> = {};
    finalSeq.forEach((n, i) => (next[n] = i));

    const changed =
      Object.keys(next).length !== Object.keys(sourceOrder).length ||
      finalSeq.some((n, i) => sourceOrder[n] !== i);

    if (changed) setSourceOrder(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources]);

  // Persist order map
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        await AsyncStorage.setItem(
          ORDER_KEY(userId),
          JSON.stringify(sourceOrder),
        );
      } catch {}
    })();
  }, [userId, sourceOrder]);

  const moveSource = (name: string, dir: 'up' | 'down') => {
    const seq = sortSources(sources, sourceOrder).map(s => keyFor(s.name));
    const k = keyFor(name);
    const i = seq.indexOf(k);
    if (i < 0) return;
    const j =
      dir === 'up' ? Math.max(0, i - 1) : Math.min(seq.length - 1, i + 1);
    if (i === j) return;

    const swapped = [...seq];
    const [item] = swapped.splice(i, 1);
    swapped.splice(j, 0, item);

    const next: Record<string, number> = {};
    swapped.forEach((n, idx) => (next[n] = idx));
    setSourceOrder(next);
  };

  const resetSourceOrderAZ = () => {
    const az = [...sources].sort((a, b) => a.name.localeCompare(b.name));
    const next: Record<string, number> = {};
    az.forEach((s, i) => (next[keyFor(s.name)] = i));
    setSourceOrder(next);
  };

  // Ordered lists for UI + chips
  const orderedSources = useMemo(
    () => sortSources(sources, sourceOrder),
    [sources, sourceOrder],
  );
  const orderedEnabled = useMemo(
    () => sortSources(enabled, sourceOrder),
    [enabled, sourceOrder],
  );

  // ───────── Combine chips ─────────
  const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
    {},
  );
  const [chips, setChips] = useState<Chip[]>([]);
  useEffect(() => {
    const personal = wardrobeBrands
      .filter(b => chipAllowlist[b] !== false)
      .slice(0, 6)
      .map(b => ({
        id: 'brand-' + b.toLowerCase(),
        label: b,
        type: 'personal' as const,
        filter: {topics: [b.toLowerCase()]},
      }));

    const trending = trendingKeywords.map(t => ({
      id: 'trend-' + t.toLowerCase(),
      label: t,
      type: 'trending' as const,
      filter: {topics: [t]},
    }));

    const context = [
      {
        id: 'ctx-weather',
        label: `Weather: ${weather}`,
        type: 'context' as const,
        filter: {constraints: {weather}},
      },
    ];

    // 🔽 Use *orderedEnabled* so chips follow the user’s order
    const sourceChips: Chip[] = orderedEnabled.map(es => ({
      id: 'src-' + es.name.toLowerCase(),
      label: es.name,
      type: 'source',
      filter: {sources: [es.name]},
    }));

    setChips([...sourceChips, ...personal, ...trending, ...context]);
  }, [
    wardrobeBrands,
    trendingKeywords,
    weather,
    orderedEnabled,
    chipAllowlist,
  ]);

  const [brandSearch, setBrandSearch] = useState('');

  // active chip selection
  const [activeChipLabel, setActiveChipLabel] = useState<string | null>(null);
  const activeFilter =
    chips.find(
      c => c.label.toLowerCase() === (activeChipLabel ?? '').toLowerCase(),
    )?.filter ?? null;

  // ───────── HERO + LIST BY TAB ─────────
  const articlesChrono = useMemo(
    () =>
      [...articles].sort(
        (a, b) =>
          (dayjs(b.publishedAt).valueOf() || 0) -
          (dayjs(a.publishedAt).valueOf() || 0),
      ),
    [articles],
  );

  const hero = tab === 'Following' ? articlesChrono[0] : articles[0];

  const restBase = useMemo(() => {
    if (tab === 'Following') {
      return articlesChrono.slice(1);
    }
    return articles.length > 1 ? articles.slice(1) : [];
  }, [tab, articles, articlesChrono]);

  const filteredForYou = useMemo(() => {
    if (!activeFilter) return restBase;

    const hasTopics = !!activeFilter.topics?.length;
    const hasSources = !!activeFilter.sources?.length;

    return restBase.filter(a => {
      const sourceOk = !hasSources
        ? true
        : activeFilter.sources!.some(
            src => src.toLowerCase() === a.source.toLowerCase(),
          );

      const topicOk = !hasTopics
        ? true
        : [a.title, a.source, a.summary].some(x =>
            activeFilter.topics!.some(t =>
              (x || '').toLowerCase().includes(t.toLowerCase()),
            ),
          );

      return sourceOk && topicOk;
    });
  }, [restBase, activeFilter]);

  const list = tab === 'For You' ? filteredForYou : restBase;

  const [manageOpen, setManageOpen] = useState(false);
  const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

  // === Send a REAL article push for testing (kept for dev) ===
  const sendTestPush = async () => {
    try {
      const candidate = hero || list?.[0];
      const data = {
        type: 'article',
        article_id: String(candidate?.id ?? Date.now()),
        url: candidate?.link ?? 'https://www.vogue.com/',
        title: candidate?.title ?? 'Fashion test article',
        source: candidate?.source ?? 'Fashion Feed',
      };

      const res = await fetch(`${API_BASE_URL}/notifications/test`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          title: data.source,
          body: data.title,
          data,
        }),
      });
      const json = await res.json();
      Alert.alert(
        'Push sent',
        `Devices notified: ${json.sent ?? json.notifications_sent ?? 0}`,
      );
    } catch (e) {
      Alert.alert('Push failed', String(e));
    }
  };

  return (
    <View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading || sourcesLoading}
            onRefresh={refresh}
            tintColor="#fff"
          />
        }
        contentContainerStyle={[
          globalStyles.container,
          {backgroundColor: theme.colors.background},
        ]}>
        <Animatable.Text
          animation="fadeInDown"
          duration={900}
          delay={100}
          easing="ease-out-cubic"
          style={[
            globalStyles.header,
            {color: theme.colors.foreground, marginBottom: 20},
          ]}>
          Fashion News
        </Animatable.Text>

        <View style={styles.topBar}>
          <Segmented
            tab={tab}
            onChange={t => {
              triggerSelection();
              setTab(t);
            }}
          />

          {/* MANAGE MENU BUTTON */}
          <AppleTouchFeedback
            onPress={() => setMenuOpen(true)}
            style={styles.iconBtn}
            hapticStyle="impactLight"
            accessibilityLabel="Manage">
            <Text style={styles.iconBtnText}>Manage</Text>
          </AppleTouchFeedback>
        </View>

        {hero && (
          <FeaturedHero
            title={hero.title}
            source={hero.source}
            image={hero.image}
            onPress={() => {
              setOpenUrl(hero.link);
              setOpenTitle(hero.title);
            }}
          />
        )}

        {tab === 'For You' && (
          <TrendChips
            items={chips.map(c => c.label)}
            selected={activeChipLabel}
            onTap={label => {
              triggerSelection();
              setActiveChipLabel(prev =>
                prev?.toLowerCase() === label.toLowerCase() ? null : label,
              );
            }}
            onMore={() => {
              triggerSelection();
              setManageBrandsOpen(true);
            }}
          />
        )}

        <View style={styles.sectionHeader}>
          <Text
            style={[
              globalStyles.sectionTitle,
              {color: theme.colors.button1, marginBottom: -2},
            ]}>
            {tab === 'For You' ? 'Recommended for you' : 'Following'}
          </Text>
        </View>

        <View style={[{paddingHorizontal: 16}]}>
          {list.map(item => (
            <ArticleCard
              key={item.id}
              title={item.title}
              source={item.source}
              image={item.image}
              time={
                item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
              }
              onPress={() => {
                setOpenUrl(item.link);
                setOpenTitle(item.title);
              }}
            />
          ))}
        </View>

        {tab === 'For You' && wardrobeBrands.length === 0 && (
          <View style={{paddingHorizontal: 16, paddingTop: 8}}>
            <View style={{flexDirection: 'row'}}>
              <Text style={globalStyles.missingDataMessage1}>
                No stories found.
              </Text>

              <View style={{alignSelf: 'flex-start'}}>
                <TooltipBubble
                  message='No fashion news feeds chosen yet. Tap the
              "Manage" button above, and click on "Feeds" or "Brands".'
                  position="top"
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <ReaderModal
        visible={!!openUrl}
        url={openUrl}
        title={openTitle}
        onClose={() => setOpenUrl(undefined)}
      />

      {/* Feeds modal */}
      <Modal
        visible={manageOpen}
        animationType="slide"
        onRequestClose={() => setManageOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Feeds</Text>
            <AppleTouchFeedback
              hapticStyle="impactLight"
              onPress={() => setManageOpen(false)}>
              <Text style={styles.done}>Done</Text>
            </AppleTouchFeedback>
          </View>
          <ScrollView contentContainerStyle={{paddingBottom: 32}}>
            {orderedSources.map((src: FeedSource, idx: number) => {
              const notifyOn = followingSet.has(src.name.toLowerCase());
              return (
                <View key={src.id} style={styles.sourceRow}>
                  <View style={{flex: 1}}>
                    <TextInput
                      defaultValue={`${idx + 1}. ${src.name}`}
                      placeholder="Name"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      onEndEditing={e =>
                        renameSource(
                          src.id,
                          e.nativeEvent.text.replace(/^\d+\.\s*/, ''),
                        )
                      }
                      style={styles.sourceName}
                    />
                    <Text style={styles.sourceUrl} numberOfLines={1}>
                      {src.url}
                    </Text>
                  </View>

                  {/* Order controls */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginRight: 6,
                    }}>
                    <AppleTouchFeedback
                      onPress={() => moveSource(src.name, 'up')}
                      hapticStyle="selection"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.colors.surface3,
                        marginLeft: 4,
                      }}>
                      <MaterialIcons
                        name="arrow-upward"
                        size={18}
                        color="#fff"
                      />
                    </AppleTouchFeedback>
                    <AppleTouchFeedback
                      onPress={() => moveSource(src.name, 'down')}
                      hapticStyle="selection"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.colors.surface3,
                        marginLeft: 4,
                      }}>
                      <MaterialIcons
                        name="arrow-downward"
                        size={18}
                        color="#fff"
                      />
                    </AppleTouchFeedback>
                  </View>

                  {/* Read toggle (in-app feed) */}
                  <View
                    style={{
                      alignItems: 'center',
                      marginLeft: 4,
                      marginRight: 10,
                      marginBottom: 14,
                    }}>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 11,
                        marginBottom: 2,
                      }}>
                      Read
                    </Text>
                    <Switch
                      value={!!src.enabled}
                      onValueChange={v => {
                        triggerSelection();
                        toggleSource(src.id, v);
                      }}
                      trackColor={{
                        false: 'rgba(255,255,255,0.18)',
                        true: '#0A84FF',
                      }}
                      thumbColor="#fff"
                    />
                  </View>

                  {/* Notify toggle (push) */}
                  <View
                    style={{
                      alignItems: 'center',
                      marginRight: 10,
                      marginBottom: 14,
                    }}>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 11,
                        marginBottom: 2,
                      }}>
                      Notify
                    </Text>
                    <Switch
                      value={notifyOn}
                      onValueChange={v => {
                        triggerSelection();
                        v ? followSource(src.name) : unfollowSource(src.name);
                      }}
                      trackColor={{
                        false: 'rgba(255,255,255,0.18)',
                        true: '#0A84FF',
                      }}
                      thumbColor="#fff"
                    />
                  </View>

                  <AppleTouchFeedback
                    onPress={() => removeSource(src.id)}
                    style={styles.removeBtn}
                    hapticStyle="impactLight">
                    <Text style={styles.removeText}>Remove</Text>
                  </AppleTouchFeedback>
                </View>
              );
            })}

            <View style={styles.addBox}>
              <Text style={styles.addTitle}>Add Feed</Text>
              <Text
                style={[
                  globalStyles.label,
                  {
                    paddingHorizontal: 1,
                    marginBottom: 17,
                    fontSize: 12,
                    fontWeight: '400',
                    color: theme.colors.foreground,
                  },
                ]}>
                Find any RSS feed URL online, then paste that URL into the "Feed
                URL" field below to save a news feed and get up to date news
                stories.
              </Text>

              {!!addError && <Text style={styles.addError}>{addError}</Text>}
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Display name (optional)"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <TextInput
                value={newUrl}
                onChangeText={setNewUrl}
                placeholder="Feed URL (https://…)"
                placeholderTextColor={theme.colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />

              <View style={{alignItems: 'center'}}>
                <AppleTouchFeedback
                  hapticStyle="impactMedium"
                  onPress={() => {
                    setAddError(null);
                    try {
                      addSource(newName, newUrl);
                      setNewName('');
                      setNewUrl('');
                    } catch (e: any) {
                      setAddError(e?.message ?? 'Could not add feed');
                    }
                  }}
                  style={[
                    globalStyles.buttonPrimary,
                    {marginBottom: 12, width: 200, marginTop: 12},
                  ]}>
                  <Text style={globalStyles.buttonPrimaryText}>Add Feed</Text>
                </AppleTouchFeedback>

                <AppleTouchFeedback
                  hapticStyle="impactLight"
                  onPress={resetToDefaults}
                  style={[
                    globalStyles.buttonPrimary,
                    {
                      backgroundColor: theme.colors.surface3,
                      marginBottom: 12,
                      width: 200,
                    },
                  ]}>
                  <Text style={globalStyles.buttonPrimaryText}>
                    Reset to Defaults
                  </Text>
                </AppleTouchFeedback>

                <AppleTouchFeedback
                  hapticStyle="impactLight"
                  onPress={resetSourceOrderAZ}
                  style={[
                    globalStyles.buttonPrimary,
                    {
                      backgroundColor: theme.colors.surface3,
                      marginBottom: 12,
                      width: 200,
                    },
                  ]}>
                  <Text style={globalStyles.buttonPrimaryText}>
                    Reset Order (A–Z)
                  </Text>
                </AppleTouchFeedback>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Brands modal */}
      <Modal
        visible={manageBrandsOpen}
        animationType="slide"
        onRequestClose={() => setManageBrandsOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Brands</Text>
            <AppleTouchFeedback
              hapticStyle="impactLight"
              onPress={() => setManageBrandsOpen(false)}>
              <Text style={styles.done}>Done</Text>
            </AppleTouchFeedback>
          </View>
          <View style={{padding: 12}}>
            <TextInput
              value={brandSearch}
              onChangeText={setBrandSearch}
              placeholder="Search your wardrobe brands…"
              placeholderTextColor={theme.colors.muted}
              style={styles.input}
            />
          </View>
          <ScrollView contentContainerStyle={{paddingBottom: 32}}>
            {wardrobeBrands.length === 0 ? (
              <View style={{paddingHorizontal: 12, paddingTop: 8}}>
                <Text style={{color: 'rgba(255,255,255,0.7)'}}>
                  No brands found yet.
                </Text>
              </View>
            ) : (
              Array.from(
                new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
              )
                .filter(
                  b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
                )
                .map(brand => {
                  const show = chipAllowlist[brand] !== false;
                  return (
                    <View key={brand} style={styles.sourceRow}>
                      <View style={{flex: 1}}>
                        <Text style={styles.sourceName}>{brand}</Text>
                      </View>
                      <Text style={{color: '#fff', marginRight: 8}}>
                        Visible
                      </Text>
                      <Switch
                        value={show}
                        onValueChange={v => {
                          triggerSelection();
                          setChipAllowlist(prev => ({...prev, [brand]: v}));
                        }}
                        trackColor={{
                          false: 'rgba(255,255,255,0.18)',
                          true: '#0A84FF',
                        }}
                        thumbColor="#fff"
                      />
                    </View>
                  );
                })
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}>
        {/* Root layer */}
        <View style={styles.menuBackdrop}>
          {/* Backdrop: closes on tap */}
          <ScrollView
            // a full-screen, non-scrolling layer that can receive the tap
            style={StyleSheet.absoluteFillObject}
            contentContainerStyle={{flex: 1}}
            scrollEnabled={false}
            onTouchStart={() => setMenuOpen(false)}
          />

          {/* Sheet: on top; taps DO NOT close */}
          <View style={styles.menuSheet}>
            {/* <Text style={styles.menuTitle}>Manage</Text> */}

            <AppleTouchFeedback
              style={styles.menuItem}
              hapticStyle="impactLight"
              onPress={() => {
                setMenuOpen(false);
                setNotifOpen(true);
              }}>
              <Text style={styles.menuItemText}>Notifications</Text>
            </AppleTouchFeedback>

            <AppleTouchFeedback
              style={styles.menuItem}
              hapticStyle="impactLight"
              onPress={() => {
                setMenuOpen(false);
                setManageBrandsOpen(true);
              }}>
              <Text style={styles.menuItemText}>Brands</Text>
            </AppleTouchFeedback>

            <AppleTouchFeedback
              style={styles.menuItem}
              hapticStyle="impactLight"
              onPress={() => {
                setMenuOpen(false);
                setManageOpen(true);
              }}>
              <Text style={styles.menuItemText}>Feeds</Text>
            </AppleTouchFeedback>
          </View>
        </View>
      </Modal>

      {/* Notifications prefs modal */}
      <Modal
        visible={notifOpen}
        animationType="slide"
        onRequestClose={() => setNotifOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <AppleTouchFeedback
              hapticStyle="impactLight"
              onPress={() => setNotifOpen(false)}>
              <Text style={styles.done}>Done</Text>
            </AppleTouchFeedback>
          </View>

          <ScrollView contentContainerStyle={{padding: 16, gap: 14}}>
            <RowToggle
              label="Enable Push"
              value={pushEnabled}
              onChange={async v => {
                triggerSelection();
                setPushEnabled(v);
                await AsyncStorage.setItem(
                  'notificationsEnabled',
                  v ? 'true' : 'false',
                );
                savePrefs({push_enabled: v});
                // init handled by effect after prefsLoaded
              }}
            />
            <RowToggle
              label="Realtime for Following"
              value={followingRealtime}
              onChange={v => {
                triggerSelection();
                setFollowingRealtime(v);
                savePrefs({following_realtime: v});
              }}
            />
            <RowToggle
              label="Realtime for Brands (For You)"
              value={brandsRealtime}
              onChange={v => {
                triggerSelection();
                setBrandsRealtime(v);
                savePrefs({brands_realtime: v});
              }}
            />
            <RowToggle
              label="Breaking Fashion News"
              value={breakingRealtime}
              onChange={v => {
                triggerSelection();
                setBreakingRealtime(v);
                savePrefs({breaking_realtime: v});
              }}
            />

            <View style={{gap: 6}}>
              <Text
                style={{
                  color: theme.colors.foreground,
                  fontWeight: '700',
                  marginBottom: 12,
                  marginTop: 20,
                }}>
                Daily Digest Hour (0–23)
              </Text>
              <TextInput
                value={String(digestHour)}
                onChangeText={txt => {
                  const n = Math.max(0, Math.min(23, Number(txt) || 0));
                  setDigestHour(n);
                }}
                onEndEditing={() => savePrefs({digest_hour: digestHour})}
                keyboardType="number-pad"
                placeholder="8"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Segmented({tab, onChange}: {tab: Tab; onChange: (t: Tab) => void}) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const seg = StyleSheet.create({
    root: {
      height: 36,
      backgroundColor: theme.colors.surface3,
      borderRadius: 10,
      padding: 3,
      flexDirection: 'row',
      flex: 1,
      maxWidth: 280,
    },
    itemWrap: {
      flex: 1,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemActive: {backgroundColor: theme.colors.background},
    itemText: {color: theme.colors.foreground3, fontWeight: '700'},
    itemTextActive: {color: theme.colors.foreground},
  });

  return (
    <View style={seg.root}>
      {(['For You', 'Following'] as Tab[]).map(t => {
        const active = t === tab;
        return (
          <View key={t} style={[seg.itemWrap, active && seg.itemActive]}>
            <AppleTouchFeedback
              hapticStyle={active ? undefined : 'impactLight'}
              onPress={() => onChange(t)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 8,
                borderRadius: 8,
              }}>
              <Text style={[seg.itemText, active && seg.itemTextActive]}>
                {t}
              </Text>
            </AppleTouchFeedback>
          </View>
        );
      })}
    </View>
  );
}

// /////////////////

// import React, {useEffect, useMemo, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   RefreshControl,
//   Modal,
//   TextInput,
//   Switch,
//   Alert,
//   Platform,
// } from 'react-native';
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// dayjs.extend(relativeTime);

// import FeaturedHero from '../components/FashionFeed/FeaturedHero';
// import ArticleCard from '../components/FashionFeed/ArticleCard';
// import TrendChips from '../components/FashionFeed/TrendChips';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {useFashionFeeds} from '../hooks/useFashionFeeds';
// import {useFeedSources, FeedSource} from '../hooks/useFeedSources';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {initializeNotifications} from '../utils/notificationService';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {useAppTheme} from '../context/ThemeContext';
// import messaging from '@react-native-firebase/messaging';
// import PushNotification from 'react-native-push-notification';
// import {addNotification} from '../storage/notifications';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import {useStyleProfile} from '../hooks/useStyleProfile';

// type Tab = 'For You' | 'Following';

// type Chip = {
//   id: string;
//   label: string;
//   type: 'personal' | 'trending' | 'context' | 'source';
//   filter: {topics?: string[]; sources?: string[]; constraints?: any};
// };

// const triggerSelection = () =>
//   ReactNativeHapticFeedback.trigger('selection', {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function ExploreScreen() {
//   const userId = useUUID() ?? '';

//   const {
//     sources,
//     enabled,
//     loading: sourcesLoading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//   } = useFeedSources({userId});

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     container: {flex: 1, backgroundColor: theme.colors.background},
//     sourceUrl: {color: theme.colors.foreground, fontSize: 12, maxWidth: 240},
//     removeBtn: {
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: theme.colors.surface,
//     },
//     removeText: {
//       color: theme.colors.foreground,
//       fontWeight: '700',
//       fontSize: 12,
//     },
//     addBox: {padding: 16, gap: 8},
//     addTitle: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 16,
//       marginBottom: 12,
//     },
//     addError: {color: theme.colors.error, fontSize: 12, marginBottom: 2},
//     addBtn: {
//       marginTop: 8,
//       backgroundColor: theme.colors.button1,
//       borderRadius: 10,
//       paddingVertical: 10,
//       alignItems: 'center',
//     },
//     addBtnText: {color: theme.colors.foreground, fontWeight: '800'},
//     resetBtn: {
//       marginTop: 8,
//       backgroundColor: theme.colors.surface2,
//       borderRadius: 10,
//       paddingVertical: 10,
//       alignItems: 'center',
//       borderColor: theme.colors.surfaceBorder,
//       borderWidth: theme.borderWidth.xl,
//     },
//     resetText: {color: theme.colors.foreground, fontWeight: '700'},
//     topBar: {
//       paddingTop: 14,
//       paddingHorizontal: 16,
//       paddingBottom: 6,
//       backgroundColor: theme.colors.background,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconBtn: {
//       marginLeft: 8,
//       width: 36,
//       height: 36,
//       borderRadius: 10,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.button1,
//     },
//     iconBtnText: {
//       color: theme.colors.foreground,
//       fontWeight: '900',
//       fontSize: 20,
//       lineHeight: 20,
//       marginTop: -2,
//     },

//     menuBackdrop: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       justifyContent: 'flex-start',
//       alignItems: 'flex-end',
//     },
//     menuSheet: {
//       marginTop: 60,
//       marginRight: 12,
//       width: 200,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       paddingVertical: 8,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 10,
//       shadowOffset: {width: 0, height: 8},
//       elevation: 8,
//     },
//     menuTitle: {
//       color: theme.colors.foreground,
//       fontSize: 12,
//       fontWeight: '700',
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//     },
//     menuItem: {
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//     },
//     menuItemText: {
//       color: theme.colors.foreground,
//       fontWeight: '700',
//     },
//     manageBtn: {
//       marginLeft: 'auto',
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: 'rgba(89, 0, 255, 1)',
//     },
//     manageText: {color: theme.colors.foreground, fontWeight: '700'},
//     sectionHeader: {
//       paddingHorizontal: 16,
//       paddingVertical: 8,
//       backgroundColor: theme.colors.background,
//     },
//     sectionTitle: {
//       color: theme.colors.button1,
//       fontWeight: '800',
//       fontSize: 20,
//     },
//     modalRoot: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       marginTop: 80,
//     },
//     modalHeader: {
//       height: 48,
//       borderBottomColor: 'rgba(255,255,255,0.1)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       paddingHorizontal: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     modalTitle: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//     },
//     done: {color: theme.colors.button1, fontWeight: '700'},
//     sourceRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 10,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       borderBottomColor: 'rgba(255,255,255,0.06)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//     },
//     sourceName: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       fontWeight: '700',
//       padding: 0,
//       marginBottom: 2,
//     },
//     input: {
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 20,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       color: theme.colors.foreground,
//       marginBottom: 8,
//     },
//     rowToggle: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       backgroundColor: 'rgba(255,255,255,0.06)',
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//       borderRadius: 10,
//     },
//     rowToggleLabel: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '700',
//     },
//   });

//   function RowToggle({
//     label,
//     value,
//     onChange,
//   }: {
//     label: string;
//     value: boolean;
//     onChange: (v: boolean) => void;
//   }) {
//     return (
//       <View style={styles.rowToggle}>
//         <Text style={styles.rowToggleLabel}>{label}</Text>
//         <Switch
//           value={value}
//           onValueChange={v => {
//             ReactNativeHapticFeedback.trigger('selection', {
//               enableVibrateFallback: true,
//               ignoreAndroidSystemSettings: false,
//             });
//             onChange(v);
//           }}
//           trackColor={{false: 'rgba(255,255,255,0.18)', true: '#0A84FF'}}
//           thumbColor="#fff"
//         />
//       </View>
//     );
//   }

//   // ───────── Tabs control which feeds we pull ─────────
//   const [tab, setTab] = useState<Tab>('For You');
//   const feedsForTab = tab === 'Following' ? enabled : sources;

//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);
//   const [menuOpen, setMenuOpen] = useState(false);

//   const {articles, loading, refresh} = useFashionFeeds(
//     feedsForTab.map(fs => ({name: fs.name, url: fs.url})),
//     {userId},
//   );

//   // ───────── Notifications: follows + preferences ─────────
//   const [notifOpen, setNotifOpen] = useState(false);
//   const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
//   const [pushEnabled, setPushEnabled] = useState(true);
//   const [followingRealtime, setFollowingRealtime] = useState(false);
//   const [brandsRealtime, setBrandsRealtime] = useState(false);
//   const [breakingRealtime, setBreakingRealtime] = useState(true);
//   const [digestHour, setDigestHour] = useState<number>(8);
//   const [prefsLoaded, setPrefsLoaded] = useState(false); // gate init

//   // === OPEN FROM NOTIFICATION -> open Reader ===
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const openFromNotification = (data: any) => {
//     if (!data) return;
//     if (data.type === 'article' && data.url) {
//       setTab('For You');
//       setOpenUrl(data.url);
//       setOpenTitle(data.title || data.source || '');
//     }
//     if (data.type === 'test') {
//       setTab('For You');
//     }
//   };

//   const sendLocalTestNotification = async () => {
//     const title = 'Inbox test';
//     const message = 'This should appear in Notifications.';
//     const deeplink = 'myapp://news/123'; // optional

//     // save to your in-app inbox (what the Notifications screen reads)
//     await addNotification(userId, {
//       title,
//       message,
//       deeplink,
//       category: 'news',
//       data: {type: 'test'},
//     });

//     // (optional) show an OS banner so you also see a toast
//     try {
//       PushNotification.localNotification({
//         channelId: 'style-channel',
//         title,
//         message,
//         playSound: true,
//         soundName: 'default',
//       });
//     } catch {}
//   };

//   // Listeners to handle push taps / foreground messages
//   useEffect(() => {
//     // App in background → user taps the push
//     const unsubOpened = messaging().onNotificationOpenedApp(msg => {
//       if (msg?.data) openFromNotification(msg.data);
//     });

//     // App was quit → opened from a push
//     messaging()
//       .getInitialNotification()
//       .then(msg => {
//         if (msg?.data) openFromNotification(msg.data);
//       });

//     // App in foreground → play chime via local notification (+ optional prompt)
//     const unsubForeground = messaging().onMessage(async msg => {
//       const d = msg?.data || {};

//       // Make a local notification so iOS/Android will play a sound in-foreground
//       try {
//         PushNotification.localNotification({
//           channelId: 'style-channel', // must match created channel
//           title: msg.notification?.title ?? d.source ?? 'Fashion Feed',
//           message: msg.notification?.body ?? d.title ?? 'New article',
//           playSound: true,
//           soundName: 'default',
//           userInfo: d, // if you later handle taps via PushNotification.configure
//         });
//       } catch (e) {
//         console.log('⚠️ localNotification error', e);
//       }

//       // Optional: keep the in-app prompt so users can open immediately
//       if (d?.type === 'article' && d?.url) {
//         Alert.alert(
//           msg.notification?.title ?? 'Fashion Feed',
//           msg.notification?.body ?? 'New article',
//           [
//             {text: 'Later', style: 'cancel'},
//             {text: 'Read now', onPress: () => openFromNotification(d)},
//           ],
//         );
//       }
//     });

//     return () => {
//       unsubOpened();
//       unsubForeground();
//     };
//   }, []);

//   // Register once, only after prefs loaded and push is ON
//   useEffect(() => {
//     (async () => {
//       if (!userId || !prefsLoaded) return;
//       await AsyncStorage.setItem(
//         'notificationsEnabled',
//         pushEnabled ? 'true' : 'false',
//       );
//       if (pushEnabled) {
//         await initializeNotifications(userId); // requests perms, gets token, registers
//         console.log('✅ Push initialized & token registration attempted');
//       } else {
//         console.log('🔕 Push disabled locally');
//       }
//     })();
//   }, [userId, prefsLoaded, pushEnabled]);

//   // Load follows
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/follows?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         );
//         const json = await res.json();
//         const list: string[] = Array.isArray(json?.sources) ? json.sources : [];
//         setFollowingSet(new Set(list.map(s => s.toLowerCase())));
//       } catch (e) {
//         console.log('⚠️ load follows failed', e);
//       }
//     })();
//   }, [userId]);

//   // Load preferences (and mirror the local flag so initialize can run)
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/preferences/get?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         ).catch(() => null);

//         const json =
//           (await res?.json().catch(() => null)) ??
//           (await (
//             await fetch(`${API_BASE_URL}/notifications/preferences`, {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify({user_id: userId}),
//             })
//           ).json());

//         if (json) {
//           const pe = json.push_enabled ?? true;
//           setPushEnabled(pe);
//           setFollowingRealtime(json.following_realtime ?? false);
//           setBrandsRealtime(json.brands_realtime ?? false);
//           setBreakingRealtime(json.breaking_realtime ?? true);
//           setDigestHour(Number(json.digest_hour ?? 8));

//           await AsyncStorage.setItem(
//             'notificationsEnabled',
//             pe ? 'true' : 'false',
//           );
//         }
//       } catch (e) {
//         console.log('⚠️ load prefs failed', e);
//       } finally {
//         setPrefsLoaded(true); // allow init effect to run
//       }
//     })();
//   }, [userId]);

//   const savePrefs = async (
//     overrides?: Partial<{
//       push_enabled: boolean;
//       following_realtime: boolean;
//       brands_realtime: boolean;
//       breaking_realtime: boolean;
//       digest_hour: number;
//     }>,
//   ) => {
//     try {
//       const payload = {
//         user_id: userId,
//         push_enabled: pushEnabled,
//         following_realtime: followingRealtime,
//         brands_realtime: brandsRealtime,
//         breaking_realtime: breakingRealtime,
//         digest_hour: digestHour,
//         ...(overrides ?? {}),
//       };
//       await fetch(`${API_BASE_URL}/notifications/preferences`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });
//     } catch (e) {
//       console.log('⚠️ save prefs failed', e);
//     }
//   };

//   const followSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => new Set([...prev, key])); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/follow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => {
//         const copy = new Set(prev);
//         copy.delete(key);
//         return copy;
//       });
//     }
//   };

//   const unfollowSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => {
//       const copy = new Set(prev);
//       copy.delete(key);
//       return copy;
//     }); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/unfollow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => new Set([...prev, key]));
//     }
//   };

//   // ───────── Personal chips ─────────
//   // const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   // useEffect(() => {
//   //   if (!userId) return;
//   //   (async () => {
//   //     try {
//   //       const res = await fetch(`${API_BASE_URL}/wardrobe/brands/${userId}`);
//   //       const json = await res.json();
//   //       setWardrobeBrands(Array.isArray(json?.brands) ? json.brands : []);
//   //     } catch {
//   //       setWardrobeBrands([]);
//   //     }
//   //   })();
//   // }, [userId]);

//   // ───────── Personal chips (from style_profiles.preferred_brands) ─────────
//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);

//   useEffect(() => {
//     if (!userId) return;

//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         console.log('👗 Preferred brands:', json);
//         setWardrobeBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch (err) {
//         console.error('❌ Failed to fetch preferred brands:', err);
//         setWardrobeBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ───────── Trending chips ─────────
//   const trendingKeywords = useMemo(() => {
//     if (!articles?.length) return [];
//     const wordCounts: Record<string, number> = {};
//     for (const a of articles) {
//       const text = `${a.title ?? ''} ${a.summary ?? ''}`.toLowerCase();
//       text.split(/\W+/).forEach(w => {
//         if (w.length > 3) wordCounts[w] = (wordCounts[w] ?? 0) + 1;
//       });
//     }
//     return Object.entries(wordCounts)
//       .sort((a, b) => b[1] - a[1])
//       .map(([w]) => w)
//       .slice(0, 10);
//   }, [articles]);

//   // ───────── Context chips ─────────
//   const [weather, setWeather] = useState('hot');
//   useEffect(() => {
//     setWeather('hot'); // placeholder; swap with real weather call
//   }, []);

//   // ───────── User-controlled feed order (persisted) ─────────
//   const ORDER_KEY = (uid: string) => `feed_source_order.v1:${uid}`;
//   const [sourceOrder, setSourceOrder] = useState<Record<string, number>>({});

//   const keyFor = (name: string) => name.trim().toLowerCase();

//   function sortSources<T extends {name: string}>(
//     list: T[],
//     orderMap: Record<string, number>,
//   ): T[] {
//     return [...list].sort((a, b) => {
//       const ra = orderMap[keyFor(a.name)] ?? Number.POSITIVE_INFINITY;
//       const rb = orderMap[keyFor(b.name)] ?? Number.POSITIVE_INFINITY;
//       if (ra !== rb) return ra - rb;
//       return a.name.localeCompare(b.name);
//     });
//   }

//   // Load saved order
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const raw = await AsyncStorage.getItem(ORDER_KEY(userId));
//         if (raw) setSourceOrder(JSON.parse(raw));
//       } catch {}
//     })();
//   }, [userId]);

//   // Sync order map with source list (append new sources at end A→Z)
//   useEffect(() => {
//     if (!sources?.length) return;
//     const orderedExisting = sortSources(sources, sourceOrder).map(s =>
//       keyFor(s.name),
//     );
//     const known = new Set(Object.keys(sourceOrder));
//     const newOnes = sources
//       .map(s => keyFor(s.name))
//       .filter(k => !known.has(k))
//       .sort((a, b) => a.localeCompare(b));

//     const finalSeq = [...orderedExisting, ...newOnes];
//     const next: Record<string, number> = {};
//     finalSeq.forEach((n, i) => (next[n] = i));

//     const changed =
//       Object.keys(next).length !== Object.keys(sourceOrder).length ||
//       finalSeq.some((n, i) => sourceOrder[n] !== i);

//     if (changed) setSourceOrder(next);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [sources]);

//   // Persist order map
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         await AsyncStorage.setItem(
//           ORDER_KEY(userId),
//           JSON.stringify(sourceOrder),
//         );
//       } catch {}
//     })();
//   }, [userId, sourceOrder]);

//   const moveSource = (name: string, dir: 'up' | 'down') => {
//     const seq = sortSources(sources, sourceOrder).map(s => keyFor(s.name));
//     const k = keyFor(name);
//     const i = seq.indexOf(k);
//     if (i < 0) return;
//     const j =
//       dir === 'up' ? Math.max(0, i - 1) : Math.min(seq.length - 1, i + 1);
//     if (i === j) return;

//     const swapped = [...seq];
//     const [item] = swapped.splice(i, 1);
//     swapped.splice(j, 0, item);

//     const next: Record<string, number> = {};
//     swapped.forEach((n, idx) => (next[n] = idx));
//     setSourceOrder(next);
//   };

//   const resetSourceOrderAZ = () => {
//     const az = [...sources].sort((a, b) => a.name.localeCompare(b.name));
//     const next: Record<string, number> = {};
//     az.forEach((s, i) => (next[keyFor(s.name)] = i));
//     setSourceOrder(next);
//   };

//   // Ordered lists for UI + chips
//   const orderedSources = useMemo(
//     () => sortSources(sources, sourceOrder),
//     [sources, sourceOrder],
//   );
//   const orderedEnabled = useMemo(
//     () => sortSources(enabled, sourceOrder),
//     [enabled, sourceOrder],
//   );

//   // ───────── Combine chips ─────────
//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [chips, setChips] = useState<Chip[]>([]);
//   useEffect(() => {
//     const personal = wardrobeBrands
//       .filter(b => chipAllowlist[b] !== false)
//       .slice(0, 6)
//       .map(b => ({
//         id: 'brand-' + b.toLowerCase(),
//         label: b,
//         type: 'personal' as const,
//         filter: {topics: [b.toLowerCase()]},
//       }));

//     const trending = trendingKeywords.map(t => ({
//       id: 'trend-' + t.toLowerCase(),
//       label: t,
//       type: 'trending' as const,
//       filter: {topics: [t]},
//     }));

//     const context = [
//       {
//         id: 'ctx-weather',
//         label: `Weather: ${weather}`,
//         type: 'context' as const,
//         filter: {constraints: {weather}},
//       },
//     ];

//     // 🔽 Use *orderedEnabled* so chips follow the user’s order
//     const sourceChips: Chip[] = orderedEnabled.map(es => ({
//       id: 'src-' + es.name.toLowerCase(),
//       label: es.name,
//       type: 'source',
//       filter: {sources: [es.name]},
//     }));

//     setChips([...sourceChips, ...personal, ...trending, ...context]);
//   }, [
//     wardrobeBrands,
//     trendingKeywords,
//     weather,
//     orderedEnabled,
//     chipAllowlist,
//   ]);

//   const [brandSearch, setBrandSearch] = useState('');

//   // active chip selection
//   const [activeChipLabel, setActiveChipLabel] = useState<string | null>(null);
//   const activeFilter =
//     chips.find(
//       c => c.label.toLowerCase() === (activeChipLabel ?? '').toLowerCase(),
//     )?.filter ?? null;

//   // ───────── HERO + LIST BY TAB ─────────
//   const articlesChrono = useMemo(
//     () =>
//       [...articles].sort(
//         (a, b) =>
//           (dayjs(b.publishedAt).valueOf() || 0) -
//           (dayjs(a.publishedAt).valueOf() || 0),
//       ),
//     [articles],
//   );

//   const hero = tab === 'Following' ? articlesChrono[0] : articles[0];

//   const restBase = useMemo(() => {
//     if (tab === 'Following') {
//       return articlesChrono.slice(1);
//     }
//     return articles.length > 1 ? articles.slice(1) : [];
//   }, [tab, articles, articlesChrono]);

//   const filteredForYou = useMemo(() => {
//     if (!activeFilter) return restBase;

//     const hasTopics = !!activeFilter.topics?.length;
//     const hasSources = !!activeFilter.sources?.length;

//     return restBase.filter(a => {
//       const sourceOk = !hasSources
//         ? true
//         : activeFilter.sources!.some(
//             src => src.toLowerCase() === a.source.toLowerCase(),
//           );

//       const topicOk = !hasTopics
//         ? true
//         : [a.title, a.source, a.summary].some(x =>
//             activeFilter.topics!.some(t =>
//               (x || '').toLowerCase().includes(t.toLowerCase()),
//             ),
//           );

//       return sourceOk && topicOk;
//     });
//   }, [restBase, activeFilter]);

//   const list = tab === 'For You' ? filteredForYou : restBase;

//   const [manageOpen, setManageOpen] = useState(false);
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

//   // === Send a REAL article push for testing (kept for dev) ===
//   const sendTestPush = async () => {
//     try {
//       const candidate = hero || list?.[0];
//       const data = {
//         type: 'article',
//         article_id: String(candidate?.id ?? Date.now()),
//         url: candidate?.link ?? 'https://www.vogue.com/',
//         title: candidate?.title ?? 'Fashion test article',
//         source: candidate?.source ?? 'Fashion Feed',
//       };

//       const res = await fetch(`${API_BASE_URL}/notifications/test`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           title: data.source,
//           body: data.title,
//           data,
//         }),
//       });
//       const json = await res.json();
//       Alert.alert(
//         'Push sent',
//         `Devices notified: ${json.sent ?? json.notifications_sent ?? 0}`,
//       );
//     } catch (e) {
//       Alert.alert('Push failed', String(e));
//     }
//   };

//   return (
//     <View>
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl
//             refreshing={loading || sourcesLoading}
//             onRefresh={refresh}
//             tintColor="#fff"
//           />
//         }
//         contentContainerStyle={[
//           globalStyles.container,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <Animatable.Text
//           animation="fadeInDown"
//           duration={900}
//           delay={100}
//           easing="ease-out-cubic"
//           style={[
//             globalStyles.header,
//             {color: theme.colors.foreground, marginBottom: 20},
//           ]}>
//           Fashion News
//         </Animatable.Text>

//         {/* <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}>Fashion News</Text>
//         </View> */}

//         <Text
//           style={[
//             globalStyles.label,
//             {
//               textAlign: 'right',
//               color: theme.colors.foreground,
//               marginRight: 86,
//               marginBottom: 0,
//               fontSize: 13,
//               fontWeight: '600',
//             },
//           ]}>
//           Manage
//         </Text>

//         <View style={styles.topBar}>
//           <Segmented
//             tab={tab}
//             onChange={t => {
//               triggerSelection();
//               setTab(t);
//             }}
//           />

//           {/* MANAGE MENU BUTTON */}
//           <AppleTouchFeedback
//             onPress={() => setMenuOpen(true)}
//             style={styles.iconBtn}
//             hapticStyle="impactLight"
//             accessibilityLabel="Manage">
//             <Text style={styles.iconBtnText}>⋯</Text>
//           </AppleTouchFeedback>
//         </View>

//         {hero && (
//           <FeaturedHero
//             title={hero.title}
//             source={hero.source}
//             image={hero.image}
//             onPress={() => {
//               setOpenUrl(hero.link);
//               setOpenTitle(hero.title);
//             }}
//           />
//         )}

//         {tab === 'For You' && (
//           <TrendChips
//             items={chips.map(c => c.label)}
//             selected={activeChipLabel}
//             onTap={label => {
//               triggerSelection();
//               setActiveChipLabel(prev =>
//                 prev?.toLowerCase() === label.toLowerCase() ? null : label,
//               );
//             }}
//             onMore={() => {
//               triggerSelection();
//               setManageBrandsOpen(true);
//             }}
//           />
//         )}

//         <View style={styles.sectionHeader}>
//           <Text
//             style={[
//               globalStyles.sectionTitle,
//               {color: theme.colors.button1, marginBottom: -2},
//             ]}>
//             {tab === 'For You' ? 'Recommended for you' : 'Following'}
//           </Text>
//         </View>

//         <View style={[{paddingHorizontal: 16}]}>
//           {list.map(item => (
//             <ArticleCard
//               key={item.id}
//               title={item.title}
//               source={item.source}
//               image={item.image}
//               time={
//                 item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//               }
//               onPress={() => {
//                 setOpenUrl(item.link);
//                 setOpenTitle(item.title);
//               }}
//             />
//           ))}
//         </View>

//         {tab === 'For You' && wardrobeBrands.length === 0 && (
//           <View style={{paddingHorizontal: 16, paddingTop: 8}}>
//             <Text
//               style={{color: theme.colors.muted, fontSize: 14, lineHeight: 18}}>
//               No content/news feeds chosen yet. Add them by going to the
//               "Manage" button, and clicking on "Feeds" or "Brands". You can also
//               adjust their notification preferences there.
//             </Text>
//           </View>
//         )}
//       </ScrollView>

//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* Feeds modal */}
//       <Modal
//         visible={manageOpen}
//         animationType="slide"
//         onRequestClose={() => setManageOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Feeds</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setManageOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {orderedSources.map((src: FeedSource, idx: number) => {
//               const notifyOn = followingSet.has(src.name.toLowerCase());
//               return (
//                 <View key={src.id} style={styles.sourceRow}>
//                   <View style={{flex: 1}}>
//                     <TextInput
//                       defaultValue={`${idx + 1}. ${src.name}`}
//                       placeholder="Name"
//                       placeholderTextColor="rgba(255,255,255,0.4)"
//                       onEndEditing={e =>
//                         renameSource(
//                           src.id,
//                           e.nativeEvent.text.replace(/^\d+\.\s*/, ''),
//                         )
//                       }
//                       style={styles.sourceName}
//                     />
//                     <Text style={styles.sourceUrl} numberOfLines={1}>
//                       {src.url}
//                     </Text>
//                   </View>

//                   {/* Order controls */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       gap: 6,
//                       marginRight: 6,
//                     }}>
//                     <AppleTouchFeedback
//                       onPress={() => moveSource(src.name, 'up')}
//                       hapticStyle="selection"
//                       style={{
//                         width: 36,
//                         height: 36,
//                         borderRadius: 8,
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         backgroundColor: theme.colors.surface3,
//                         marginLeft: 4,
//                       }}>
//                       <MaterialIcons
//                         name="arrow-upward"
//                         size={18}
//                         color="#fff"
//                       />
//                     </AppleTouchFeedback>
//                     <AppleTouchFeedback
//                       onPress={() => moveSource(src.name, 'down')}
//                       hapticStyle="selection"
//                       style={{
//                         width: 36,
//                         height: 36,
//                         borderRadius: 8,
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         backgroundColor: theme.colors.surface3,
//                         marginLeft: 4,
//                       }}>
//                       <MaterialIcons
//                         name="arrow-downward"
//                         size={18}
//                         color="#fff"
//                       />
//                     </AppleTouchFeedback>
//                   </View>

//                   {/* Read toggle (in-app feed) */}
//                   <View
//                     style={{
//                       alignItems: 'center',
//                       marginLeft: 4,
//                       marginRight: 10,
//                       marginBottom: 14,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Read
//                     </Text>
//                     <Switch
//                       value={!!src.enabled}
//                       onValueChange={v => {
//                         triggerSelection();
//                         toggleSource(src.id, v);
//                       }}
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   {/* Notify toggle (push) */}
//                   <View
//                     style={{
//                       alignItems: 'center',
//                       marginRight: 10,
//                       marginBottom: 14,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Notify
//                     </Text>
//                     <Switch
//                       value={notifyOn}
//                       onValueChange={v => {
//                         triggerSelection();
//                         v ? followSource(src.name) : unfollowSource(src.name);
//                       }}
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   <AppleTouchFeedback
//                     onPress={() => removeSource(src.id)}
//                     style={styles.removeBtn}
//                     hapticStyle="impactLight">
//                     <Text style={styles.removeText}>Remove</Text>
//                   </AppleTouchFeedback>
//                 </View>
//               );
//             })}

//             <View style={styles.addBox}>
//               <Text style={styles.addTitle}>Add Feed</Text>
//               <Text
//                 style={[
//                   globalStyles.label,
//                   {
//                     paddingHorizontal: 1,
//                     marginBottom: 17,
//                     fontSize: 12,
//                     fontWeight: '400',
//                     color: theme.colors.foreground,
//                   },
//                 ]}>
//                 Find any RSS feed URL online, then paste that URL into the "Feed
//                 URL" field below to save a news feed and get up to date news
//                 stories.
//               </Text>

//               {!!addError && <Text style={styles.addError}>{addError}</Text>}
//               <TextInput
//                 value={newName}
//                 onChangeText={setNewName}
//                 placeholder="Display name (optional)"
//                 placeholderTextColor={theme.colors.muted}
//                 style={styles.input}
//               />
//               <TextInput
//                 value={newUrl}
//                 onChangeText={setNewUrl}
//                 placeholder="Feed URL (https://…)"
//                 placeholderTextColor={theme.colors.muted}
//                 autoCapitalize="none"
//                 autoCorrect={false}
//                 style={styles.input}
//               />

//               <View style={{alignItems: 'center'}}>
//                 <AppleTouchFeedback
//                   hapticStyle="impactMedium"
//                   onPress={() => {
//                     setAddError(null);
//                     try {
//                       addSource(newName, newUrl);
//                       setNewName('');
//                       setNewUrl('');
//                     } catch (e: any) {
//                       setAddError(e?.message ?? 'Could not add feed');
//                     }
//                   }}
//                   style={[
//                     globalStyles.buttonPrimary,
//                     {marginBottom: 12, width: 200, marginTop: 12},
//                   ]}>
//                   <Text style={globalStyles.buttonPrimaryText}>Add Feed</Text>
//                 </AppleTouchFeedback>

//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={resetToDefaults}
//                   style={[
//                     globalStyles.buttonPrimary,
//                     {
//                       backgroundColor: theme.colors.surface3,
//                       marginBottom: 12,
//                       width: 200,
//                     },
//                   ]}>
//                   <Text style={globalStyles.buttonPrimaryText}>
//                     Reset to Defaults
//                   </Text>
//                 </AppleTouchFeedback>

//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={resetSourceOrderAZ}
//                   style={[
//                     globalStyles.buttonPrimary,
//                     {
//                       backgroundColor: theme.colors.surface3,
//                       marginBottom: 12,
//                       width: 200,
//                     },
//                   ]}>
//                   <Text style={globalStyles.buttonPrimaryText}>
//                     Reset Order (A–Z)
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
//           </ScrollView>
//         </View>
//       </Modal>

//       {/* Brands modal */}
//       <Modal
//         visible={manageBrandsOpen}
//         animationType="slide"
//         onRequestClose={() => setManageBrandsOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Brands</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setManageBrandsOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>
//           <View style={{padding: 12}}>
//             <TextInput
//               value={brandSearch}
//               onChangeText={setBrandSearch}
//               placeholder="Search your wardrobe brands…"
//               placeholderTextColor={theme.colors.muted}
//               style={styles.input}
//             />
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {wardrobeBrands.length === 0 ? (
//               <View style={{paddingHorizontal: 12, paddingTop: 8}}>
//                 <Text style={{color: 'rgba(255,255,255,0.7)'}}>
//                   No brands found yet.
//                 </Text>
//               </View>
//             ) : (
//               Array.from(
//                 new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//               )
//                 .filter(
//                   b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//                 )
//                 .map(brand => {
//                   const show = chipAllowlist[brand] !== false;
//                   return (
//                     <View key={brand} style={styles.sourceRow}>
//                       <View style={{flex: 1}}>
//                         <Text style={styles.sourceName}>{brand}</Text>
//                       </View>
//                       <Text style={{color: '#fff', marginRight: 8}}>
//                         Visible
//                       </Text>
//                       <Switch
//                         value={show}
//                         onValueChange={v => {
//                           triggerSelection();
//                           setChipAllowlist(prev => ({...prev, [brand]: v}));
//                         }}
//                         trackColor={{
//                           false: 'rgba(255,255,255,0.18)',
//                           true: '#0A84FF',
//                         }}
//                         thumbColor="#fff"
//                       />
//                     </View>
//                   );
//                 })
//             )}
//           </ScrollView>
//         </View>
//       </Modal>

//       <Modal
//         visible={menuOpen}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setMenuOpen(false)}>
//         {/* Root layer */}
//         <View style={styles.menuBackdrop}>
//           {/* Backdrop: closes on tap */}
//           <ScrollView
//             // a full-screen, non-scrolling layer that can receive the tap
//             style={StyleSheet.absoluteFillObject}
//             contentContainerStyle={{flex: 1}}
//             scrollEnabled={false}
//             onTouchStart={() => setMenuOpen(false)}
//           />

//           {/* Sheet: on top; taps DO NOT close */}
//           <View style={styles.menuSheet}>
//             {/* <Text style={styles.menuTitle}>Manage</Text> */}

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setNotifOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Notifications</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageBrandsOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Brands</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Feeds</Text>
//             </AppleTouchFeedback>
//           </View>
//         </View>
//       </Modal>

//       {/* Notifications prefs modal */}
//       <Modal
//         visible={notifOpen}
//         animationType="slide"
//         onRequestClose={() => setNotifOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Notifications</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setNotifOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>

//           <ScrollView contentContainerStyle={{padding: 16, gap: 14}}>
//             <RowToggle
//               label="Enable Push"
//               value={pushEnabled}
//               onChange={async v => {
//                 triggerSelection();
//                 setPushEnabled(v);
//                 await AsyncStorage.setItem(
//                   'notificationsEnabled',
//                   v ? 'true' : 'false',
//                 );
//                 savePrefs({push_enabled: v});
//                 // init handled by effect after prefsLoaded
//               }}
//             />
//             <RowToggle
//               label="Realtime for Following"
//               value={followingRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setFollowingRealtime(v);
//                 savePrefs({following_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Realtime for Brands (For You)"
//               value={brandsRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setBrandsRealtime(v);
//                 savePrefs({brands_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Breaking Fashion News"
//               value={breakingRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setBreakingRealtime(v);
//                 savePrefs({breaking_realtime: v});
//               }}
//             />

//             <View style={{gap: 6}}>
//               <Text
//                 style={{
//                   color: theme.colors.foreground,
//                   fontWeight: '700',
//                   marginBottom: 12,
//                   marginTop: 20,
//                 }}>
//                 Daily Digest Hour (0–23)
//               </Text>
//               <TextInput
//                 value={String(digestHour)}
//                 onChangeText={txt => {
//                   const n = Math.max(0, Math.min(23, Number(txt) || 0));
//                   setDigestHour(n);
//                 }}
//                 onEndEditing={() => savePrefs({digest_hour: digestHour})}
//                 keyboardType="number-pad"
//                 placeholder="8"
//                 placeholderTextColor={theme.colors.muted}
//                 style={styles.input}
//               />
//             </View>
//           </ScrollView>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// function Segmented({tab, onChange}: {tab: Tab; onChange: (t: Tab) => void}) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const seg = StyleSheet.create({
//     root: {
//       height: 36,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 10,
//       padding: 3,
//       flexDirection: 'row',
//       flex: 1,
//       maxWidth: 280,
//     },
//     itemWrap: {
//       flex: 1,
//       borderRadius: 8,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     itemActive: {backgroundColor: theme.colors.background},
//     itemText: {color: theme.colors.foreground3, fontWeight: '700'},
//     itemTextActive: {color: theme.colors.foreground},
//   });

//   return (
//     <View style={seg.root}>
//       {(['For You', 'Following'] as Tab[]).map(t => {
//         const active = t === tab;
//         return (
//           <View key={t} style={[seg.itemWrap, active && seg.itemActive]}>
//             <AppleTouchFeedback
//               hapticStyle={active ? undefined : 'impactLight'}
//               onPress={() => onChange(t)}
//               style={{
//                 paddingVertical: 6,
//                 paddingHorizontal: 8,
//                 borderRadius: 8,
//               }}>
//               <Text style={[seg.itemText, active && seg.itemTextActive]}>
//                 {t}
//               </Text>
//             </AppleTouchFeedback>
//           </View>
//         );
//       })}
//     </View>
//   );
// }

//////////////////

// /////////////////

// import React, {useEffect, useMemo, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   RefreshControl,
//   Modal,
//   TextInput,
//   Switch,
//   Alert,
//   Platform,
// } from 'react-native';
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// dayjs.extend(relativeTime);

// import FeaturedHero from '../components/FashionFeed/FeaturedHero';
// import ArticleCard from '../components/FashionFeed/ArticleCard';
// import TrendChips from '../components/FashionFeed/TrendChips';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {useFashionFeeds} from '../hooks/useFashionFeeds';
// import {useFeedSources, FeedSource} from '../hooks/useFeedSources';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {initializeNotifications} from '../utils/notificationService';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {useAppTheme} from '../context/ThemeContext';
// import messaging from '@react-native-firebase/messaging';
// import PushNotification from 'react-native-push-notification';
// import {addNotification} from '../storage/notifications';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';

// type Tab = 'For You' | 'Following';

// type Chip = {
//   id: string;
//   label: string;
//   type: 'personal' | 'trending' | 'context' | 'source';
//   filter: {topics?: string[]; sources?: string[]; constraints?: any};
// };

// const triggerSelection = () =>
//   ReactNativeHapticFeedback.trigger('selection', {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function ExploreScreen() {
//   const userId = useUUID() ?? '';

//   const {
//     sources,
//     enabled,
//     loading: sourcesLoading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//   } = useFeedSources({userId});

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     container: {flex: 1, backgroundColor: theme.colors.background},
//     sourceUrl: {color: theme.colors.foreground, fontSize: 12, maxWidth: 240},
//     removeBtn: {
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: theme.colors.surface,
//     },
//     removeText: {
//       color: theme.colors.foreground,
//       fontWeight: '700',
//       fontSize: 12,
//     },
//     addBox: {padding: 16, gap: 8},
//     addTitle: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 16,
//       marginBottom: 12,
//     },
//     addError: {color: theme.colors.error, fontSize: 12, marginBottom: 2},
//     addBtn: {
//       marginTop: 8,
//       backgroundColor: theme.colors.button1,
//       borderRadius: 10,
//       paddingVertical: 10,
//       alignItems: 'center',
//     },
//     addBtnText: {color: theme.colors.foreground, fontWeight: '800'},
//     resetBtn: {
//       marginTop: 8,
//       backgroundColor: theme.colors.surface2,
//       borderRadius: 10,
//       paddingVertical: 10,
//       alignItems: 'center',
//       borderColor: theme.colors.surfaceBorder,
//       borderWidth: theme.borderWidth.xl,
//     },
//     resetText: {color: theme.colors.foreground, fontWeight: '700'},
//     topBar: {
//       paddingTop: 14,
//       paddingHorizontal: 16,
//       paddingBottom: 6,
//       backgroundColor: theme.colors.background,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconBtn: {
//       marginLeft: 8,
//       width: 36,
//       height: 36,
//       borderRadius: 10,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.button1,
//     },
//     iconBtnText: {
//       color: theme.colors.foreground,
//       fontWeight: '900',
//       fontSize: 20,
//       lineHeight: 20,
//       marginTop: -2,
//     },

//     menuBackdrop: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       justifyContent: 'flex-start',
//       alignItems: 'flex-end',
//     },
//     menuSheet: {
//       marginTop: 60,
//       marginRight: 12,
//       width: 200,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       paddingVertical: 8,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 10,
//       shadowOffset: {width: 0, height: 8},
//       elevation: 8,
//     },
//     menuTitle: {
//       color: theme.colors.foreground,
//       fontSize: 12,
//       fontWeight: '700',
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//     },
//     menuItem: {
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//     },
//     menuItemText: {
//       color: theme.colors.foreground,
//       fontWeight: '700',
//     },
//     manageBtn: {
//       marginLeft: 'auto',
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: 'rgba(89, 0, 255, 1)',
//     },
//     manageText: {color: theme.colors.foreground, fontWeight: '700'},
//     sectionHeader: {
//       paddingHorizontal: 16,
//       paddingVertical: 8,
//       backgroundColor: theme.colors.background,
//     },
//     sectionTitle: {
//       color: theme.colors.button1,
//       fontWeight: '800',
//       fontSize: 20,
//     },
//     modalRoot: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       marginTop: 80,
//     },
//     modalHeader: {
//       height: 48,
//       borderBottomColor: 'rgba(255,255,255,0.1)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       paddingHorizontal: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     modalTitle: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//     },
//     done: {color: theme.colors.button1, fontWeight: '700'},
//     sourceRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 10,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       borderBottomColor: 'rgba(255,255,255,0.06)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//     },
//     sourceName: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       fontWeight: '700',
//       padding: 0,
//       marginBottom: 2,
//     },
//     input: {
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 20,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       color: theme.colors.foreground,
//       marginBottom: 8,
//     },
//     rowToggle: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       backgroundColor: 'rgba(255,255,255,0.06)',
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//       borderRadius: 10,
//     },
//     rowToggleLabel: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '700',
//     },
//   });

//   function RowToggle({
//     label,
//     value,
//     onChange,
//   }: {
//     label: string;
//     value: boolean;
//     onChange: (v: boolean) => void;
//   }) {
//     return (
//       <View style={styles.rowToggle}>
//         <Text style={styles.rowToggleLabel}>{label}</Text>
//         <Switch
//           value={value}
//           onValueChange={v => {
//             ReactNativeHapticFeedback.trigger('selection', {
//               enableVibrateFallback: true,
//               ignoreAndroidSystemSettings: false,
//             });
//             onChange(v);
//           }}
//           trackColor={{false: 'rgba(255,255,255,0.18)', true: '#0A84FF'}}
//           thumbColor="#fff"
//         />
//       </View>
//     );
//   }

//   // ───────── Tabs control which feeds we pull ─────────
//   const [tab, setTab] = useState<Tab>('For You');
//   const feedsForTab = tab === 'Following' ? enabled : sources;

//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);
//   const [menuOpen, setMenuOpen] = useState(false);

//   const {articles, loading, refresh} = useFashionFeeds(
//     feedsForTab.map(fs => ({name: fs.name, url: fs.url})),
//     {userId},
//   );

//   // ───────── Notifications: follows + preferences ─────────
//   const [notifOpen, setNotifOpen] = useState(false);
//   const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
//   const [pushEnabled, setPushEnabled] = useState(true);
//   const [followingRealtime, setFollowingRealtime] = useState(false);
//   const [brandsRealtime, setBrandsRealtime] = useState(false);
//   const [breakingRealtime, setBreakingRealtime] = useState(true);
//   const [digestHour, setDigestHour] = useState<number>(8);
//   const [prefsLoaded, setPrefsLoaded] = useState(false); // gate init

//   // === OPEN FROM NOTIFICATION -> open Reader ===
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const openFromNotification = (data: any) => {
//     if (!data) return;
//     if (data.type === 'article' && data.url) {
//       setTab('For You');
//       setOpenUrl(data.url);
//       setOpenTitle(data.title || data.source || '');
//     }
//     if (data.type === 'test') {
//       setTab('For You');
//     }
//   };

//   const sendLocalTestNotification = async () => {
//     const title = 'Inbox test';
//     const message = 'This should appear in Notifications.';
//     const deeplink = 'myapp://news/123'; // optional

//     // save to your in-app inbox (what the Notifications screen reads)
//     await addNotification(userId, {
//       title,
//       message,
//       deeplink,
//       category: 'news',
//       data: {type: 'test'},
//     });

//     // (optional) show an OS banner so you also see a toast
//     try {
//       PushNotification.localNotification({
//         channelId: 'style-channel',
//         title,
//         message,
//         playSound: true,
//         soundName: 'default',
//       });
//     } catch {}
//   };

//   // Listeners to handle push taps / foreground messages
//   useEffect(() => {
//     // App in background → user taps the push
//     const unsubOpened = messaging().onNotificationOpenedApp(msg => {
//       if (msg?.data) openFromNotification(msg.data);
//     });

//     // App was quit → opened from a push
//     messaging()
//       .getInitialNotification()
//       .then(msg => {
//         if (msg?.data) openFromNotification(msg.data);
//       });

//     // App in foreground → play chime via local notification (+ optional prompt)
//     const unsubForeground = messaging().onMessage(async msg => {
//       const d = msg?.data || {};

//       // Make a local notification so iOS/Android will play a sound in-foreground
//       try {
//         PushNotification.localNotification({
//           channelId: 'style-channel', // must match created channel
//           title: msg.notification?.title ?? d.source ?? 'Fashion Feed',
//           message: msg.notification?.body ?? d.title ?? 'New article',
//           playSound: true,
//           soundName: 'default',
//           userInfo: d, // if you later handle taps via PushNotification.configure
//         });
//       } catch (e) {
//         console.log('⚠️ localNotification error', e);
//       }

//       // Optional: keep the in-app prompt so users can open immediately
//       if (d?.type === 'article' && d?.url) {
//         Alert.alert(
//           msg.notification?.title ?? 'Fashion Feed',
//           msg.notification?.body ?? 'New article',
//           [
//             {text: 'Later', style: 'cancel'},
//             {text: 'Read now', onPress: () => openFromNotification(d)},
//           ],
//         );
//       }
//     });

//     return () => {
//       unsubOpened();
//       unsubForeground();
//     };
//   }, []);

//   // Register once, only after prefs loaded and push is ON
//   useEffect(() => {
//     (async () => {
//       if (!userId || !prefsLoaded) return;
//       await AsyncStorage.setItem(
//         'notificationsEnabled',
//         pushEnabled ? 'true' : 'false',
//       );
//       if (pushEnabled) {
//         await initializeNotifications(userId); // requests perms, gets token, registers
//         console.log('✅ Push initialized & token registration attempted');
//       } else {
//         console.log('🔕 Push disabled locally');
//       }
//     })();
//   }, [userId, prefsLoaded, pushEnabled]);

//   // Load follows
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/follows?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         );
//         const json = await res.json();
//         const list: string[] = Array.isArray(json?.sources) ? json.sources : [];
//         setFollowingSet(new Set(list.map(s => s.toLowerCase())));
//       } catch (e) {
//         console.log('⚠️ load follows failed', e);
//       }
//     })();
//   }, [userId]);

//   // Load preferences (and mirror the local flag so initialize can run)
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/preferences/get?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         ).catch(() => null);

//         const json =
//           (await res?.json().catch(() => null)) ??
//           (await (
//             await fetch(`${API_BASE_URL}/notifications/preferences`, {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify({user_id: userId}),
//             })
//           ).json());

//         if (json) {
//           const pe = json.push_enabled ?? true;
//           setPushEnabled(pe);
//           setFollowingRealtime(json.following_realtime ?? false);
//           setBrandsRealtime(json.brands_realtime ?? false);
//           setBreakingRealtime(json.breaking_realtime ?? true);
//           setDigestHour(Number(json.digest_hour ?? 8));

//           await AsyncStorage.setItem(
//             'notificationsEnabled',
//             pe ? 'true' : 'false',
//           );
//         }
//       } catch (e) {
//         console.log('⚠️ load prefs failed', e);
//       } finally {
//         setPrefsLoaded(true); // allow init effect to run
//       }
//     })();
//   }, [userId]);

//   const savePrefs = async (
//     overrides?: Partial<{
//       push_enabled: boolean;
//       following_realtime: boolean;
//       brands_realtime: boolean;
//       breaking_realtime: boolean;
//       digest_hour: number;
//     }>,
//   ) => {
//     try {
//       const payload = {
//         user_id: userId,
//         push_enabled: pushEnabled,
//         following_realtime: followingRealtime,
//         brands_realtime: brandsRealtime,
//         breaking_realtime: breakingRealtime,
//         digest_hour: digestHour,
//         ...(overrides ?? {}),
//       };
//       await fetch(`${API_BASE_URL}/notifications/preferences`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });
//     } catch (e) {
//       console.log('⚠️ save prefs failed', e);
//     }
//   };

//   const followSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => new Set([...prev, key])); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/follow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => {
//         const copy = new Set(prev);
//         copy.delete(key);
//         return copy;
//       });
//     }
//   };

//   const unfollowSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => {
//       const copy = new Set(prev);
//       copy.delete(key);
//       return copy;
//     }); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/unfollow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => new Set([...prev, key]));
//     }
//   };

//   // ───────── Personal chips ─────────
//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/wardrobe/brands/${userId}`);
//         const json = await res.json();
//         setWardrobeBrands(Array.isArray(json?.brands) ? json.brands : []);
//       } catch {
//         setWardrobeBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ───────── Trending chips ─────────
//   const trendingKeywords = useMemo(() => {
//     if (!articles?.length) return [];
//     const wordCounts: Record<string, number> = {};
//     for (const a of articles) {
//       const text = `${a.title ?? ''} ${a.summary ?? ''}`.toLowerCase();
//       text.split(/\W+/).forEach(w => {
//         if (w.length > 3) wordCounts[w] = (wordCounts[w] ?? 0) + 1;
//       });
//     }
//     return Object.entries(wordCounts)
//       .sort((a, b) => b[1] - a[1])
//       .map(([w]) => w)
//       .slice(0, 10);
//   }, [articles]);

//   // ───────── Context chips ─────────
//   const [weather, setWeather] = useState('hot');
//   useEffect(() => {
//     setWeather('hot'); // placeholder; swap with real weather call
//   }, []);

//   // ───────── User-controlled feed order (persisted) ─────────
//   const ORDER_KEY = (uid: string) => `feed_source_order.v1:${uid}`;
//   const [sourceOrder, setSourceOrder] = useState<Record<string, number>>({});

//   const keyFor = (name: string) => name.trim().toLowerCase();

//   function sortSources<T extends {name: string}>(
//     list: T[],
//     orderMap: Record<string, number>,
//   ): T[] {
//     return [...list].sort((a, b) => {
//       const ra = orderMap[keyFor(a.name)] ?? Number.POSITIVE_INFINITY;
//       const rb = orderMap[keyFor(b.name)] ?? Number.POSITIVE_INFINITY;
//       if (ra !== rb) return ra - rb;
//       return a.name.localeCompare(b.name);
//     });
//   }

//   // Load saved order
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const raw = await AsyncStorage.getItem(ORDER_KEY(userId));
//         if (raw) setSourceOrder(JSON.parse(raw));
//       } catch {}
//     })();
//   }, [userId]);

//   // Sync order map with source list (append new sources at end A→Z)
//   useEffect(() => {
//     if (!sources?.length) return;
//     const orderedExisting = sortSources(sources, sourceOrder).map(s =>
//       keyFor(s.name),
//     );
//     const known = new Set(Object.keys(sourceOrder));
//     const newOnes = sources
//       .map(s => keyFor(s.name))
//       .filter(k => !known.has(k))
//       .sort((a, b) => a.localeCompare(b));

//     const finalSeq = [...orderedExisting, ...newOnes];
//     const next: Record<string, number> = {};
//     finalSeq.forEach((n, i) => (next[n] = i));

//     const changed =
//       Object.keys(next).length !== Object.keys(sourceOrder).length ||
//       finalSeq.some((n, i) => sourceOrder[n] !== i);

//     if (changed) setSourceOrder(next);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [sources]);

//   // Persist order map
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         await AsyncStorage.setItem(
//           ORDER_KEY(userId),
//           JSON.stringify(sourceOrder),
//         );
//       } catch {}
//     })();
//   }, [userId, sourceOrder]);

//   const moveSource = (name: string, dir: 'up' | 'down') => {
//     const seq = sortSources(sources, sourceOrder).map(s => keyFor(s.name));
//     const k = keyFor(name);
//     const i = seq.indexOf(k);
//     if (i < 0) return;
//     const j =
//       dir === 'up' ? Math.max(0, i - 1) : Math.min(seq.length - 1, i + 1);
//     if (i === j) return;

//     const swapped = [...seq];
//     const [item] = swapped.splice(i, 1);
//     swapped.splice(j, 0, item);

//     const next: Record<string, number> = {};
//     swapped.forEach((n, idx) => (next[n] = idx));
//     setSourceOrder(next);
//   };

//   const resetSourceOrderAZ = () => {
//     const az = [...sources].sort((a, b) => a.name.localeCompare(b.name));
//     const next: Record<string, number> = {};
//     az.forEach((s, i) => (next[keyFor(s.name)] = i));
//     setSourceOrder(next);
//   };

//   // Ordered lists for UI + chips
//   const orderedSources = useMemo(
//     () => sortSources(sources, sourceOrder),
//     [sources, sourceOrder],
//   );
//   const orderedEnabled = useMemo(
//     () => sortSources(enabled, sourceOrder),
//     [enabled, sourceOrder],
//   );

//   // ───────── Combine chips ─────────
//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [chips, setChips] = useState<Chip[]>([]);
//   useEffect(() => {
//     const personal = wardrobeBrands
//       .filter(b => chipAllowlist[b] !== false)
//       .slice(0, 6)
//       .map(b => ({
//         id: 'brand-' + b.toLowerCase(),
//         label: b,
//         type: 'personal' as const,
//         filter: {topics: [b.toLowerCase()]},
//       }));

//     const trending = trendingKeywords.map(t => ({
//       id: 'trend-' + t.toLowerCase(),
//       label: t,
//       type: 'trending' as const,
//       filter: {topics: [t]},
//     }));

//     const context = [
//       {
//         id: 'ctx-weather',
//         label: `Weather: ${weather}`,
//         type: 'context' as const,
//         filter: {constraints: {weather}},
//       },
//     ];

//     // 🔽 Use *orderedEnabled* so chips follow the user’s order
//     const sourceChips: Chip[] = orderedEnabled.map(es => ({
//       id: 'src-' + es.name.toLowerCase(),
//       label: es.name,
//       type: 'source',
//       filter: {sources: [es.name]},
//     }));

//     setChips([...sourceChips, ...personal, ...trending, ...context]);
//   }, [
//     wardrobeBrands,
//     trendingKeywords,
//     weather,
//     orderedEnabled,
//     chipAllowlist,
//   ]);

//   const [brandSearch, setBrandSearch] = useState('');

//   // active chip selection
//   const [activeChipLabel, setActiveChipLabel] = useState<string | null>(null);
//   const activeFilter =
//     chips.find(
//       c => c.label.toLowerCase() === (activeChipLabel ?? '').toLowerCase(),
//     )?.filter ?? null;

//   // ───────── HERO + LIST BY TAB ─────────
//   const articlesChrono = useMemo(
//     () =>
//       [...articles].sort(
//         (a, b) =>
//           (dayjs(b.publishedAt).valueOf() || 0) -
//           (dayjs(a.publishedAt).valueOf() || 0),
//       ),
//     [articles],
//   );

//   const hero = tab === 'Following' ? articlesChrono[0] : articles[0];

//   const restBase = useMemo(() => {
//     if (tab === 'Following') {
//       return articlesChrono.slice(1);
//     }
//     return articles.length > 1 ? articles.slice(1) : [];
//   }, [tab, articles, articlesChrono]);

//   const filteredForYou = useMemo(() => {
//     if (!activeFilter) return restBase;

//     const hasTopics = !!activeFilter.topics?.length;
//     const hasSources = !!activeFilter.sources?.length;

//     return restBase.filter(a => {
//       const sourceOk = !hasSources
//         ? true
//         : activeFilter.sources!.some(
//             src => src.toLowerCase() === a.source.toLowerCase(),
//           );

//       const topicOk = !hasTopics
//         ? true
//         : [a.title, a.source, a.summary].some(x =>
//             activeFilter.topics!.some(t =>
//               (x || '').toLowerCase().includes(t.toLowerCase()),
//             ),
//           );

//       return sourceOk && topicOk;
//     });
//   }, [restBase, activeFilter]);

//   const list = tab === 'For You' ? filteredForYou : restBase;

//   const [manageOpen, setManageOpen] = useState(false);
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

//   // === Send a REAL article push for testing (kept for dev) ===
//   const sendTestPush = async () => {
//     try {
//       const candidate = hero || list?.[0];
//       const data = {
//         type: 'article',
//         article_id: String(candidate?.id ?? Date.now()),
//         url: candidate?.link ?? 'https://www.vogue.com/',
//         title: candidate?.title ?? 'Fashion test article',
//         source: candidate?.source ?? 'Fashion Feed',
//       };

//       const res = await fetch(`${API_BASE_URL}/notifications/test`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           title: data.source,
//           body: data.title,
//           data,
//         }),
//       });
//       const json = await res.json();
//       Alert.alert(
//         'Push sent',
//         `Devices notified: ${json.sent ?? json.notifications_sent ?? 0}`,
//       );
//     } catch (e) {
//       Alert.alert('Push failed', String(e));
//     }
//   };

//   return (
//     <View>
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl
//             refreshing={loading || sourcesLoading}
//             onRefresh={refresh}
//             tintColor="#fff"
//           />
//         }
//         contentContainerStyle={[
//           globalStyles.container,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <Animatable.Text
//           animation="fadeInDown"
//           duration={900}
//           delay={100}
//           easing="ease-out-cubic"
//           style={[
//             globalStyles.header,
//             {color: theme.colors.foreground, marginBottom: 20},
//           ]}>
//           Fashion News
//         </Animatable.Text>

//         {/* <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}>Fashion News</Text>
//         </View> */}

//         <Text
//           style={[
//             globalStyles.label,
//             {
//               textAlign: 'right',
//               color: theme.colors.foreground,
//               marginRight: 86,
//               marginBottom: 0,
//               fontSize: 13,
//               fontWeight: '600',
//             },
//           ]}>
//           Manage
//         </Text>

//         <View style={styles.topBar}>
//           <Segmented
//             tab={tab}
//             onChange={t => {
//               triggerSelection();
//               setTab(t);
//             }}
//           />

//           {/* MANAGE MENU BUTTON */}
//           <AppleTouchFeedback
//             onPress={() => setMenuOpen(true)}
//             style={styles.iconBtn}
//             hapticStyle="impactLight"
//             accessibilityLabel="Manage">
//             <Text style={styles.iconBtnText}>⋯</Text>
//           </AppleTouchFeedback>
//         </View>

//         {hero && (
//           <FeaturedHero
//             title={hero.title}
//             source={hero.source}
//             image={hero.image}
//             onPress={() => {
//               setOpenUrl(hero.link);
//               setOpenTitle(hero.title);
//             }}
//           />
//         )}

//         {tab === 'For You' && (
//           <TrendChips
//             items={chips.map(c => c.label)}
//             selected={activeChipLabel}
//             onTap={label => {
//               triggerSelection();
//               setActiveChipLabel(prev =>
//                 prev?.toLowerCase() === label.toLowerCase() ? null : label,
//               );
//             }}
//             onMore={() => {
//               triggerSelection();
//               setManageBrandsOpen(true);
//             }}
//           />
//         )}

//         <View style={styles.sectionHeader}>
//           <Text
//             style={[
//               globalStyles.sectionTitle,
//               {color: theme.colors.button1, marginBottom: -2},
//             ]}>
//             {tab === 'For You' ? 'Recommended for you' : 'Following'}
//           </Text>
//         </View>

//         <View style={[{paddingHorizontal: 16}]}>
//           {list.map(item => (
//             <ArticleCard
//               key={item.id}
//               title={item.title}
//               source={item.source}
//               image={item.image}
//               time={
//                 item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//               }
//               onPress={() => {
//                 setOpenUrl(item.link);
//                 setOpenTitle(item.title);
//               }}
//             />
//           ))}
//         </View>

//         {tab === 'For You' && wardrobeBrands.length === 0 && (
//           <View style={{paddingHorizontal: 16, paddingTop: 8}}>
//             <Text
//               style={{color: theme.colors.muted, fontSize: 14, lineHeight: 18}}>
//               No content/news feeds chosen yet. Add them by going to the
//               "Manage" button, and clicking on "Feeds" or "Brands". You can also
//               adjust their notification preferences there.
//             </Text>
//           </View>
//         )}
//       </ScrollView>

//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* Feeds modal */}
//       <Modal
//         visible={manageOpen}
//         animationType="slide"
//         onRequestClose={() => setManageOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Feeds</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setManageOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {orderedSources.map((src: FeedSource, idx: number) => {
//               const notifyOn = followingSet.has(src.name.toLowerCase());
//               return (
//                 <View key={src.id} style={styles.sourceRow}>
//                   <View style={{flex: 1}}>
//                     <TextInput
//                       defaultValue={`${idx + 1}. ${src.name}`}
//                       placeholder="Name"
//                       placeholderTextColor="rgba(255,255,255,0.4)"
//                       onEndEditing={e =>
//                         renameSource(
//                           src.id,
//                           e.nativeEvent.text.replace(/^\d+\.\s*/, ''),
//                         )
//                       }
//                       style={styles.sourceName}
//                     />
//                     <Text style={styles.sourceUrl} numberOfLines={1}>
//                       {src.url}
//                     </Text>
//                   </View>

//                   {/* Order controls */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       gap: 6,
//                       marginRight: 6,
//                     }}>
//                     <AppleTouchFeedback
//                       onPress={() => moveSource(src.name, 'up')}
//                       hapticStyle="selection"
//                       style={{
//                         width: 36,
//                         height: 36,
//                         borderRadius: 8,
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         backgroundColor: theme.colors.surface3,
//                         marginLeft: 4,
//                       }}>
//                       <MaterialIcons
//                         name="arrow-upward"
//                         size={18}
//                         color="#fff"
//                       />
//                     </AppleTouchFeedback>
//                     <AppleTouchFeedback
//                       onPress={() => moveSource(src.name, 'down')}
//                       hapticStyle="selection"
//                       style={{
//                         width: 36,
//                         height: 36,
//                         borderRadius: 8,
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         backgroundColor: theme.colors.surface3,
//                         marginLeft: 4,
//                       }}>
//                       <MaterialIcons
//                         name="arrow-downward"
//                         size={18}
//                         color="#fff"
//                       />
//                     </AppleTouchFeedback>
//                   </View>

//                   {/* Read toggle (in-app feed) */}
//                   <View
//                     style={{
//                       alignItems: 'center',
//                       marginLeft: 4,
//                       marginRight: 10,
//                       marginBottom: 14,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Read
//                     </Text>
//                     <Switch
//                       value={!!src.enabled}
//                       onValueChange={v => {
//                         triggerSelection();
//                         toggleSource(src.id, v);
//                       }}
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   {/* Notify toggle (push) */}
//                   <View
//                     style={{
//                       alignItems: 'center',
//                       marginRight: 10,
//                       marginBottom: 14,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Notify
//                     </Text>
//                     <Switch
//                       value={notifyOn}
//                       onValueChange={v => {
//                         triggerSelection();
//                         v ? followSource(src.name) : unfollowSource(src.name);
//                       }}
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   <AppleTouchFeedback
//                     onPress={() => removeSource(src.id)}
//                     style={styles.removeBtn}
//                     hapticStyle="impactLight">
//                     <Text style={styles.removeText}>Remove</Text>
//                   </AppleTouchFeedback>
//                 </View>
//               );
//             })}

//             <View style={styles.addBox}>
//               <Text style={styles.addTitle}>Add Feed</Text>
//               <Text
//                 style={[
//                   globalStyles.label,
//                   {
//                     paddingHorizontal: 1,
//                     marginBottom: 17,
//                     fontSize: 12,
//                     fontWeight: '400',
//                     color: theme.colors.foreground,
//                   },
//                 ]}>
//                 Find any RSS feed URL online, then paste that URL into the "Feed
//                 URL" field below to save a news feed and get up to date news
//                 stories.
//               </Text>

//               {!!addError && <Text style={styles.addError}>{addError}</Text>}
//               <TextInput
//                 value={newName}
//                 onChangeText={setNewName}
//                 placeholder="Display name (optional)"
//                 placeholderTextColor={theme.colors.muted}
//                 style={styles.input}
//               />
//               <TextInput
//                 value={newUrl}
//                 onChangeText={setNewUrl}
//                 placeholder="Feed URL (https://…)"
//                 placeholderTextColor={theme.colors.muted}
//                 autoCapitalize="none"
//                 autoCorrect={false}
//                 style={styles.input}
//               />
//               <AppleTouchFeedback
//                 hapticStyle="impactMedium"
//                 onPress={() => {
//                   setAddError(null);
//                   try {
//                     addSource(newName, newUrl);
//                     setNewName('');
//                     setNewUrl('');
//                   } catch (e: any) {
//                     setAddError(e?.message ?? 'Could not add feed');
//                   }
//                 }}
//                 style={styles.addBtn}>
//                 <Text style={styles.addBtnText}>Add Feed</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetToDefaults}
//                 style={styles.resetBtn}>
//                 <Text style={styles.resetText}>Reset to Defaults</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetSourceOrderAZ}
//                 style={[styles.resetBtn, {marginTop: 8}]}>
//                 <Text style={styles.resetText}>Reset Order (A–Z)</Text>
//               </AppleTouchFeedback>
//             </View>
//           </ScrollView>
//         </View>
//       </Modal>

//       {/* Brands modal */}
//       <Modal
//         visible={manageBrandsOpen}
//         animationType="slide"
//         onRequestClose={() => setManageBrandsOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Brands</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setManageBrandsOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>
//           <View style={{padding: 12}}>
//             <TextInput
//               value={brandSearch}
//               onChangeText={setBrandSearch}
//               placeholder="Search your wardrobe brands…"
//               placeholderTextColor={theme.colors.muted}
//               style={styles.input}
//             />
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {wardrobeBrands.length === 0 ? (
//               <View style={{paddingHorizontal: 12, paddingTop: 8}}>
//                 <Text style={{color: 'rgba(255,255,255,0.7)'}}>
//                   No brands found yet.
//                 </Text>
//               </View>
//             ) : (
//               Array.from(
//                 new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//               )
//                 .filter(
//                   b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//                 )
//                 .map(brand => {
//                   const show = chipAllowlist[brand] !== false;
//                   return (
//                     <View key={brand} style={styles.sourceRow}>
//                       <View style={{flex: 1}}>
//                         <Text style={styles.sourceName}>{brand}</Text>
//                       </View>
//                       <Text style={{color: '#fff', marginRight: 8}}>
//                         Visible
//                       </Text>
//                       <Switch
//                         value={show}
//                         onValueChange={v => {
//                           triggerSelection();
//                           setChipAllowlist(prev => ({...prev, [brand]: v}));
//                         }}
//                         trackColor={{
//                           false: 'rgba(255,255,255,0.18)',
//                           true: '#0A84FF',
//                         }}
//                         thumbColor="#fff"
//                       />
//                     </View>
//                   );
//                 })
//             )}
//           </ScrollView>
//         </View>
//       </Modal>

//       <Modal
//         visible={menuOpen}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setMenuOpen(false)}>
//         {/* Root layer */}
//         <View style={styles.menuBackdrop}>
//           {/* Backdrop: closes on tap */}
//           <ScrollView
//             // a full-screen, non-scrolling layer that can receive the tap
//             style={StyleSheet.absoluteFillObject}
//             contentContainerStyle={{flex: 1}}
//             scrollEnabled={false}
//             onTouchStart={() => setMenuOpen(false)}
//           />

//           {/* Sheet: on top; taps DO NOT close */}
//           <View style={styles.menuSheet}>
//             {/* <Text style={styles.menuTitle}>Manage</Text> */}

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setNotifOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Notifications</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageBrandsOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Brands</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Feeds</Text>
//             </AppleTouchFeedback>
//           </View>
//         </View>
//       </Modal>

//       {/* Notifications prefs modal */}
//       <Modal
//         visible={notifOpen}
//         animationType="slide"
//         onRequestClose={() => setNotifOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Notifications</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setNotifOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>

//           <ScrollView contentContainerStyle={{padding: 16, gap: 14}}>
//             <RowToggle
//               label="Enable Push"
//               value={pushEnabled}
//               onChange={async v => {
//                 triggerSelection();
//                 setPushEnabled(v);
//                 await AsyncStorage.setItem(
//                   'notificationsEnabled',
//                   v ? 'true' : 'false',
//                 );
//                 savePrefs({push_enabled: v});
//                 // init handled by effect after prefsLoaded
//               }}
//             />
//             <RowToggle
//               label="Realtime for Following"
//               value={followingRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setFollowingRealtime(v);
//                 savePrefs({following_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Realtime for Brands (For You)"
//               value={brandsRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setBrandsRealtime(v);
//                 savePrefs({brands_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Breaking Fashion News"
//               value={breakingRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setBreakingRealtime(v);
//                 savePrefs({breaking_realtime: v});
//               }}
//             />

//             <View style={{gap: 6}}>
//               <Text
//                 style={{
//                   color: theme.colors.foreground,
//                   fontWeight: '700',
//                   marginBottom: 12,
//                   marginTop: 20,
//                 }}>
//                 Daily Digest Hour (0–23)
//               </Text>
//               <TextInput
//                 value={String(digestHour)}
//                 onChangeText={txt => {
//                   const n = Math.max(0, Math.min(23, Number(txt) || 0));
//                   setDigestHour(n);
//                 }}
//                 onEndEditing={() => savePrefs({digest_hour: digestHour})}
//                 keyboardType="number-pad"
//                 placeholder="8"
//                 placeholderTextColor={theme.colors.muted}
//                 style={styles.input}
//               />
//             </View>
//           </ScrollView>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// function Segmented({tab, onChange}: {tab: Tab; onChange: (t: Tab) => void}) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const seg = StyleSheet.create({
//     root: {
//       height: 36,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 10,
//       padding: 3,
//       flexDirection: 'row',
//       flex: 1,
//       maxWidth: 280,
//     },
//     itemWrap: {
//       flex: 1,
//       borderRadius: 8,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     itemActive: {backgroundColor: theme.colors.background},
//     itemText: {color: theme.colors.foreground3, fontWeight: '700'},
//     itemTextActive: {color: theme.colors.foreground},
//   });

//   return (
//     <View style={seg.root}>
//       {(['For You', 'Following'] as Tab[]).map(t => {
//         const active = t === tab;
//         return (
//           <View key={t} style={[seg.itemWrap, active && seg.itemActive]}>
//             <AppleTouchFeedback
//               hapticStyle={active ? undefined : 'impactLight'}
//               onPress={() => onChange(t)}
//               style={{
//                 paddingVertical: 6,
//                 paddingHorizontal: 8,
//                 borderRadius: 8,
//               }}>
//               <Text style={[seg.itemText, active && seg.itemTextActive]}>
//                 {t}
//               </Text>
//             </AppleTouchFeedback>
//           </View>
//         );
//       })}
//     </View>
//   );
// }

//////////////////

// import React, {useEffect, useMemo, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   RefreshControl,
//   Modal,
//   TextInput,
//   Switch,
//   Alert,
//   Platform,
// } from 'react-native';
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// dayjs.extend(relativeTime);

// import FeaturedHero from '../components/FashionFeed/FeaturedHero';
// import ArticleCard from '../components/FashionFeed/ArticleCard';
// import TrendChips from '../components/FashionFeed/TrendChips';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {useFashionFeeds} from '../hooks/useFashionFeeds';
// import {useFeedSources, FeedSource} from '../hooks/useFeedSources';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {initializeNotifications} from '../utils/notificationService';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {useAppTheme} from '../context/ThemeContext';
// import messaging from '@react-native-firebase/messaging';
// import PushNotification from 'react-native-push-notification';
// import {addNotification} from '../storage/notifications';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// type Tab = 'For You' | 'Following';

// type Chip = {
//   id: string;
//   label: string;
//   type: 'personal' | 'trending' | 'context' | 'source';
//   filter: {topics?: string[]; sources?: string[]; constraints?: any};
// };

// const triggerSelection = () =>
//   ReactNativeHapticFeedback.trigger('selection', {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function ExploreScreen() {
//   const userId = useUUID() ?? '';

//   const {
//     sources,
//     enabled,
//     loading: sourcesLoading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//   } = useFeedSources({userId});

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     container: {flex: 1, backgroundColor: theme.colors.background},
//     sourceUrl: {color: theme.colors.foreground, fontSize: 12, maxWidth: 240},
//     removeBtn: {
//       marginLeft: 6,
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: theme.colors.surface,
//     },
//     removeText: {
//       color: theme.colors.foreground,
//       fontWeight: '700',
//       fontSize: 12,
//     },
//     addBox: {padding: 16, gap: 8},
//     addTitle: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 16,
//       marginBottom: 4,
//     },
//     addError: {color: '#FF453A', fontSize: 12, marginBottom: 2},
//     addBtn: {
//       marginTop: 8,
//       backgroundColor: theme.colors.button1,
//       borderRadius: 10,
//       paddingVertical: 10,
//       alignItems: 'center',
//     },
//     addBtnText: {color: theme.colors.foreground, fontWeight: '800'},
//     resetBtn: {
//       marginTop: 8,
//       backgroundColor: theme.colors.surface2,
//       borderRadius: 10,
//       paddingVertical: 10,
//       alignItems: 'center',
//       borderColor: theme.colors.surfaceBorder,
//       borderWidth: theme.borderWidth.xl,
//     },
//     resetText: {color: theme.colors.foreground, fontWeight: '700'},
//     topBar: {
//       paddingTop: 14,
//       paddingHorizontal: 16,
//       paddingBottom: 6,
//       backgroundColor: theme.colors.background,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconBtn: {
//       marginLeft: 8,
//       width: 36,
//       height: 36,
//       borderRadius: 10,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.button1,
//     },
//     iconBtnText: {
//       color: theme.colors.foreground,
//       fontWeight: '900',
//       fontSize: 20,
//       lineHeight: 20,
//       marginTop: -2,
//     },

//     menuBackdrop: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       justifyContent: 'flex-start',
//       alignItems: 'flex-end',
//     },
//     menuSheet: {
//       marginTop: 60,
//       marginRight: 12,
//       width: 200,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       paddingVertical: 8,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 10,
//       shadowOffset: {width: 0, height: 8},
//       elevation: 8,
//     },
//     menuTitle: {
//       color: theme.colors.foreground,
//       fontSize: 12,
//       fontWeight: '700',
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//     },
//     menuItem: {
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//     },
//     menuItemText: {
//       color: theme.colors.foreground,
//       fontWeight: '700',
//     },
//     manageBtn: {
//       marginLeft: 'auto',
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: 'rgba(89, 0, 255, 1)',
//     },
//     manageText: {color: theme.colors.foreground, fontWeight: '700'},
//     sectionHeader: {
//       paddingHorizontal: 16,
//       paddingVertical: 8,
//       backgroundColor: theme.colors.background,
//     },
//     sectionTitle: {
//       color: theme.colors.button1,
//       fontWeight: '800',
//       fontSize: 20,
//     },
//     modalRoot: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       marginTop: 80,
//     },
//     modalHeader: {
//       height: 48,
//       borderBottomColor: 'rgba(255,255,255,0.1)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       paddingHorizontal: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     modalTitle: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//     },
//     done: {color: theme.colors.button1, fontWeight: '700'},
//     sourceRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 10,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       borderBottomColor: 'rgba(255,255,255,0.06)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//     },
//     sourceName: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       fontWeight: '700',
//       padding: 0,
//       marginBottom: 2,
//     },
//     input: {
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 20,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       color: theme.colors.foreground,
//       marginBottom: 8,
//     },
//     rowToggle: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       backgroundColor: 'rgba(255,255,255,0.06)',
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//       borderRadius: 10,
//     },
//     rowToggleLabel: {color: '#fff', fontSize: 14, fontWeight: '700'},
//   });

//   // ───────── Tabs control which feeds we pull ─────────
//   const [tab, setTab] = useState<Tab>('For You');
//   const feedsForTab = tab === 'Following' ? enabled : sources;

//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);
//   const [menuOpen, setMenuOpen] = useState(false);

//   const {articles, loading, refresh} = useFashionFeeds(
//     feedsForTab.map(fs => ({name: fs.name, url: fs.url})),
//     {userId},
//   );

//   // ───────── Notifications: follows + preferences ─────────
//   const [notifOpen, setNotifOpen] = useState(false);
//   const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
//   const [pushEnabled, setPushEnabled] = useState(true);
//   const [followingRealtime, setFollowingRealtime] = useState(false);
//   const [brandsRealtime, setBrandsRealtime] = useState(false);
//   const [breakingRealtime, setBreakingRealtime] = useState(true);
//   const [digestHour, setDigestHour] = useState<number>(8);
//   const [prefsLoaded, setPrefsLoaded] = useState(false); // gate init

//   // === OPEN FROM NOTIFICATION -> open Reader ===
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const openFromNotification = (data: any) => {
//     if (!data) return;
//     if (data.type === 'article' && data.url) {
//       setTab('For You');
//       setOpenUrl(data.url);
//       setOpenTitle(data.title || data.source || '');
//     }
//     if (data.type === 'test') {
//       setTab('For You');
//     }
//   };

//   const sendLocalTestNotification = async () => {
//     const title = 'Inbox test';
//     const message = 'This should appear in Notifications.';
//     const deeplink = 'myapp://news/123'; // optional

//     // save to your in-app inbox (what the Notifications screen reads)
//     await addNotification(userId, {
//       title,
//       message,
//       deeplink,
//       category: 'news',
//       data: {type: 'test'},
//     });

//     // (optional) show an OS banner so you also see a toast
//     try {
//       PushNotification.localNotification({
//         channelId: 'style-channel',
//         title,
//         message,
//         playSound: true,
//         soundName: 'default',
//       });
//     } catch {}
//   };

//   // Listeners to handle push taps / foreground messages
//   useEffect(() => {
//     // App in background → user taps the push
//     const unsubOpened = messaging().onNotificationOpenedApp(msg => {
//       if (msg?.data) openFromNotification(msg.data);
//     });

//     // App was quit → opened from a push
//     messaging()
//       .getInitialNotification()
//       .then(msg => {
//         if (msg?.data) openFromNotification(msg.data);
//       });

//     // App in foreground → play chime via local notification (+ optional prompt)
//     const unsubForeground = messaging().onMessage(async msg => {
//       const d = msg?.data || {};

//       // Make a local notification so iOS/Android will play a sound in-foreground
//       try {
//         PushNotification.localNotification({
//           channelId: 'style-channel', // must match created channel
//           title: msg.notification?.title ?? d.source ?? 'Fashion Feed',
//           message: msg.notification?.body ?? d.title ?? 'New article',
//           playSound: true,
//           soundName: 'default',
//           userInfo: d, // if you later handle taps via PushNotification.configure
//         });
//       } catch (e) {
//         console.log('⚠️ localNotification error', e);
//       }

//       // Optional: keep the in-app prompt so users can open immediately
//       if (d?.type === 'article' && d?.url) {
//         Alert.alert(
//           msg.notification?.title ?? 'Fashion Feed',
//           msg.notification?.body ?? 'New article',
//           [
//             {text: 'Later', style: 'cancel'},
//             {text: 'Read now', onPress: () => openFromNotification(d)},
//           ],
//         );
//       }
//     });

//     return () => {
//       unsubOpened();
//       unsubForeground();
//     };
//   }, []);

//   // Register once, only after prefs loaded and push is ON
//   useEffect(() => {
//     (async () => {
//       if (!userId || !prefsLoaded) return;
//       await AsyncStorage.setItem(
//         'notificationsEnabled',
//         pushEnabled ? 'true' : 'false',
//       );
//       if (pushEnabled) {
//         await initializeNotifications(userId); // requests perms, gets token, registers
//         console.log('✅ Push initialized & token registration attempted');
//       } else {
//         console.log('🔕 Push disabled locally');
//       }
//     })();
//   }, [userId, prefsLoaded, pushEnabled]);

//   // Load follows
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/follows?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         );
//         const json = await res.json();
//         const list: string[] = Array.isArray(json?.sources) ? json.sources : [];
//         setFollowingSet(new Set(list.map(s => s.toLowerCase())));
//       } catch (e) {
//         console.log('⚠️ load follows failed', e);
//       }
//     })();
//   }, [userId]);

//   // Load preferences (and mirror the local flag so initialize can run)
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/preferences/get?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         ).catch(() => null);

//         const json =
//           (await res?.json().catch(() => null)) ??
//           (await (
//             await fetch(`${API_BASE_URL}/notifications/preferences`, {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify({user_id: userId}),
//             })
//           ).json());

//         if (json) {
//           const pe = json.push_enabled ?? true;
//           setPushEnabled(pe);
//           setFollowingRealtime(json.following_realtime ?? false);
//           setBrandsRealtime(json.brands_realtime ?? false);
//           setBreakingRealtime(json.breaking_realtime ?? true);
//           setDigestHour(Number(json.digest_hour ?? 8));

//           await AsyncStorage.setItem(
//             'notificationsEnabled',
//             pe ? 'true' : 'false',
//           );
//         }
//       } catch (e) {
//         console.log('⚠️ load prefs failed', e);
//       } finally {
//         setPrefsLoaded(true); // allow init effect to run
//       }
//     })();
//   }, [userId]);

//   const savePrefs = async (
//     overrides?: Partial<{
//       push_enabled: boolean;
//       following_realtime: boolean;
//       brands_realtime: boolean;
//       breaking_realtime: boolean;
//       digest_hour: number;
//     }>,
//   ) => {
//     try {
//       const payload = {
//         user_id: userId,
//         push_enabled: pushEnabled,
//         following_realtime: followingRealtime,
//         brands_realtime: brandsRealtime,
//         breaking_realtime: breakingRealtime,
//         digest_hour: digestHour,
//         ...(overrides ?? {}),
//       };
//       await fetch(`${API_BASE_URL}/notifications/preferences`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });
//     } catch (e) {
//       console.log('⚠️ save prefs failed', e);
//     }
//   };

//   const followSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => new Set([...prev, key])); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/follow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => {
//         const copy = new Set(prev);
//         copy.delete(key);
//         return copy;
//       });
//     }
//   };

//   const unfollowSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => {
//       const copy = new Set(prev);
//       copy.delete(key);
//       return copy;
//     }); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/unfollow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => new Set([...prev, key]));
//     }
//   };

//   // ───────── Personal chips ─────────
//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/wardrobe/brands/${userId}`);
//         const json = await res.json();
//         setWardrobeBrands(Array.isArray(json?.brands) ? json.brands : []);
//       } catch {
//         setWardrobeBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ───────── Trending chips ─────────
//   const trendingKeywords = useMemo(() => {
//     if (!articles?.length) return [];
//     const wordCounts: Record<string, number> = {};
//     for (const a of articles) {
//       const text = `${a.title ?? ''} ${a.summary ?? ''}`.toLowerCase();
//       text.split(/\W+/).forEach(w => {
//         if (w.length > 3) wordCounts[w] = (wordCounts[w] ?? 0) + 1;
//       });
//     }
//     return Object.entries(wordCounts)
//       .sort((a, b) => b[1] - a[1])
//       .map(([w]) => w)
//       .slice(0, 10);
//   }, [articles]);

//   // ───────── Context chips ─────────
//   const [weather, setWeather] = useState('hot');
//   useEffect(() => {
//     setWeather('hot'); // placeholder; swap with real weather call
//   }, []);

//   // ───────── User-controlled feed order (persisted) ─────────
//   const ORDER_KEY = (uid: string) => `feed_source_order.v1:${uid}`;
//   const [sourceOrder, setSourceOrder] = useState<Record<string, number>>({});

//   const keyFor = (name: string) => name.trim().toLowerCase();

//   function sortSources<T extends {name: string}>(
//     list: T[],
//     orderMap: Record<string, number>,
//   ): T[] {
//     return [...list].sort((a, b) => {
//       const ra = orderMap[keyFor(a.name)] ?? Number.POSITIVE_INFINITY;
//       const rb = orderMap[keyFor(b.name)] ?? Number.POSITIVE_INFINITY;
//       if (ra !== rb) return ra - rb;
//       return a.name.localeCompare(b.name);
//     });
//   }

//   // Load saved order
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const raw = await AsyncStorage.getItem(ORDER_KEY(userId));
//         if (raw) setSourceOrder(JSON.parse(raw));
//       } catch {}
//     })();
//   }, [userId]);

//   // Sync order map with source list (append new sources at end A→Z)
//   useEffect(() => {
//     if (!sources?.length) return;
//     const orderedExisting = sortSources(sources, sourceOrder).map(s =>
//       keyFor(s.name),
//     );
//     const known = new Set(Object.keys(sourceOrder));
//     const newOnes = sources
//       .map(s => keyFor(s.name))
//       .filter(k => !known.has(k))
//       .sort((a, b) => a.localeCompare(b));

//     const finalSeq = [...orderedExisting, ...newOnes];
//     const next: Record<string, number> = {};
//     finalSeq.forEach((n, i) => (next[n] = i));

//     const changed =
//       Object.keys(next).length !== Object.keys(sourceOrder).length ||
//       finalSeq.some((n, i) => sourceOrder[n] !== i);

//     if (changed) setSourceOrder(next);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [sources]);

//   // Persist order map
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         await AsyncStorage.setItem(
//           ORDER_KEY(userId),
//           JSON.stringify(sourceOrder),
//         );
//       } catch {}
//     })();
//   }, [userId, sourceOrder]);

//   const moveSource = (name: string, dir: 'up' | 'down') => {
//     const seq = sortSources(sources, sourceOrder).map(s => keyFor(s.name));
//     const k = keyFor(name);
//     const i = seq.indexOf(k);
//     if (i < 0) return;
//     const j =
//       dir === 'up' ? Math.max(0, i - 1) : Math.min(seq.length - 1, i + 1);
//     if (i === j) return;

//     const swapped = [...seq];
//     const [item] = swapped.splice(i, 1);
//     swapped.splice(j, 0, item);

//     const next: Record<string, number> = {};
//     swapped.forEach((n, idx) => (next[n] = idx));
//     setSourceOrder(next);
//   };

//   const resetSourceOrderAZ = () => {
//     const az = [...sources].sort((a, b) => a.name.localeCompare(b.name));
//     const next: Record<string, number> = {};
//     az.forEach((s, i) => (next[keyFor(s.name)] = i));
//     setSourceOrder(next);
//   };

//   // Ordered lists for UI + chips
//   const orderedSources = useMemo(
//     () => sortSources(sources, sourceOrder),
//     [sources, sourceOrder],
//   );
//   const orderedEnabled = useMemo(
//     () => sortSources(enabled, sourceOrder),
//     [enabled, sourceOrder],
//   );

//   // ───────── Combine chips ─────────
//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [chips, setChips] = useState<Chip[]>([]);
//   useEffect(() => {
//     const personal = wardrobeBrands
//       .filter(b => chipAllowlist[b] !== false)
//       .slice(0, 6)
//       .map(b => ({
//         id: 'brand-' + b.toLowerCase(),
//         label: b,
//         type: 'personal' as const,
//         filter: {topics: [b.toLowerCase()]},
//       }));

//     const trending = trendingKeywords.map(t => ({
//       id: 'trend-' + t.toLowerCase(),
//       label: t,
//       type: 'trending' as const,
//       filter: {topics: [t]},
//     }));

//     const context = [
//       {
//         id: 'ctx-weather',
//         label: `Weather: ${weather}`,
//         type: 'context' as const,
//         filter: {constraints: {weather}},
//       },
//     ];

//     // 🔽 Use *orderedEnabled* so chips follow the user’s order
//     const sourceChips: Chip[] = orderedEnabled.map(es => ({
//       id: 'src-' + es.name.toLowerCase(),
//       label: es.name,
//       type: 'source',
//       filter: {sources: [es.name]},
//     }));

//     setChips([...sourceChips, ...personal, ...trending, ...context]);
//   }, [
//     wardrobeBrands,
//     trendingKeywords,
//     weather,
//     orderedEnabled,
//     chipAllowlist,
//   ]);

//   const [brandSearch, setBrandSearch] = useState('');

//   // active chip selection
//   const [activeChipLabel, setActiveChipLabel] = useState<string | null>(null);
//   const activeFilter =
//     chips.find(
//       c => c.label.toLowerCase() === (activeChipLabel ?? '').toLowerCase(),
//     )?.filter ?? null;

//   // ───────── HERO + LIST BY TAB ─────────
//   const articlesChrono = useMemo(
//     () =>
//       [...articles].sort(
//         (a, b) =>
//           (dayjs(b.publishedAt).valueOf() || 0) -
//           (dayjs(a.publishedAt).valueOf() || 0),
//       ),
//     [articles],
//   );

//   const hero = tab === 'Following' ? articlesChrono[0] : articles[0];

//   const restBase = useMemo(() => {
//     if (tab === 'Following') {
//       return articlesChrono.slice(1);
//     }
//     return articles.length > 1 ? articles.slice(1) : [];
//   }, [tab, articles, articlesChrono]);

//   const filteredForYou = useMemo(() => {
//     if (!activeFilter) return restBase;

//     const hasTopics = !!activeFilter.topics?.length;
//     const hasSources = !!activeFilter.sources?.length;

//     return restBase.filter(a => {
//       const sourceOk = !hasSources
//         ? true
//         : activeFilter.sources!.some(
//             src => src.toLowerCase() === a.source.toLowerCase(),
//           );

//       const topicOk = !hasTopics
//         ? true
//         : [a.title, a.source, a.summary].some(x =>
//             activeFilter.topics!.some(t =>
//               (x || '').toLowerCase().includes(t.toLowerCase()),
//             ),
//           );

//       return sourceOk && topicOk;
//     });
//   }, [restBase, activeFilter]);

//   const list = tab === 'For You' ? filteredForYou : restBase;

//   const [manageOpen, setManageOpen] = useState(false);
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

//   // === Send a REAL article push for testing (kept for dev) ===
//   const sendTestPush = async () => {
//     try {
//       const candidate = hero || list?.[0];
//       const data = {
//         type: 'article',
//         article_id: String(candidate?.id ?? Date.now()),
//         url: candidate?.link ?? 'https://www.vogue.com/',
//         title: candidate?.title ?? 'Fashion test article',
//         source: candidate?.source ?? 'Fashion Feed',
//       };

//       const res = await fetch(`${API_BASE_URL}/notifications/test`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           title: data.source,
//           body: data.title,
//           data,
//         }),
//       });
//       const json = await res.json();
//       Alert.alert(
//         'Push sent',
//         `Devices notified: ${json.sent ?? json.notifications_sent ?? 0}`,
//       );
//     } catch (e) {
//       Alert.alert('Push failed', String(e));
//     }
//   };

//   return (
//     <View>
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl
//             refreshing={loading || sourcesLoading}
//             onRefresh={refresh}
//             tintColor="#fff"
//           />
//         }
//         contentContainerStyle={[
//           globalStyles.container,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}>Fashion News</Text>
//         </View>

//         <View style={styles.topBar}>
//           <Segmented
//             tab={tab}
//             onChange={t => {
//               triggerSelection();
//               setTab(t);
//             }}
//           />
//           <AppleTouchFeedback
//             onPress={() => setMenuOpen(true)}
//             style={styles.iconBtn}
//             hapticStyle="impactLight"
//             accessibilityLabel="Manage">
//             <Text style={styles.iconBtnText}>⋯</Text>
//           </AppleTouchFeedback>
//         </View>

//         {hero && (
//           <FeaturedHero
//             title={hero.title}
//             source={hero.source}
//             image={hero.image}
//             onPress={() => {
//               setOpenUrl(hero.link);
//               setOpenTitle(hero.title);
//             }}
//           />
//         )}

//         {tab === 'For You' && (
//           <TrendChips
//             items={chips.map(c => c.label)}
//             selected={activeChipLabel}
//             onTap={label => {
//               triggerSelection();
//               setActiveChipLabel(prev =>
//                 prev?.toLowerCase() === label.toLowerCase() ? null : label,
//               );
//             }}
//             onMore={() => {
//               triggerSelection();
//               setManageBrandsOpen(true);
//             }}
//           />
//         )}

//         <View style={styles.sectionHeader}>
//           <Text
//             style={[
//               globalStyles.sectionTitle,
//               {color: theme.colors.button1, marginBottom: -2},
//             ]}>
//             {tab === 'For You' ? 'Recommended for you' : 'Following'}
//           </Text>
//         </View>

//         <View style={[{paddingHorizontal: 16}]}>
//           {list.map(item => (
//             <ArticleCard
//               key={item.id}
//               title={item.title}
//               source={item.source}
//               image={item.image}
//               time={
//                 item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//               }
//               onPress={() => {
//                 setOpenUrl(item.link);
//                 setOpenTitle(item.title);
//               }}
//             />
//           ))}
//         </View>

//         {tab === 'For You' && wardrobeBrands.length === 0 && (
//           <View style={{paddingHorizontal: 16, paddingTop: 8}}>
//             <Text style={{color: 'rgba(255,255,255,0.6)', fontSize: 12}}>
//               No wardrobe brands detected yet. Add items to your wardrobe to
//               unlock personalized brand chips.
//             </Text>
//           </View>
//         )}
//       </ScrollView>

//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* Feeds modal */}
//       <Modal
//         visible={manageOpen}
//         animationType="slide"
//         onRequestClose={() => setManageOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Feeds</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setManageOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {orderedSources.map((src: FeedSource, idx: number) => {
//               const notifyOn = followingSet.has(src.name.toLowerCase());
//               return (
//                 <View key={src.id} style={styles.sourceRow}>
//                   <View style={{flex: 1}}>
//                     <TextInput
//                       defaultValue={`${idx + 1}. ${src.name}`}
//                       placeholder="Name"
//                       placeholderTextColor="rgba(255,255,255,0.4)"
//                       onEndEditing={e =>
//                         renameSource(
//                           src.id,
//                           e.nativeEvent.text.replace(/^\d+\.\s*/, ''),
//                         )
//                       }
//                       style={styles.sourceName}
//                     />
//                     <Text style={styles.sourceUrl} numberOfLines={1}>
//                       {src.url}
//                     </Text>
//                   </View>

//                   {/* Order controls */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       gap: 6,
//                       marginRight: 6,
//                     }}>
//                     <AppleTouchFeedback
//                       onPress={() => moveSource(src.name, 'up')}
//                       hapticStyle="selection"
//                       style={{
//                         width: 36,
//                         height: 36,
//                         borderRadius: 8,
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         backgroundColor: theme.colors.surface3,
//                         marginLeft: 4,
//                       }}>
//                       <MaterialIcons
//                         name="arrow-upward"
//                         size={18}
//                         color="#fff"
//                       />
//                     </AppleTouchFeedback>
//                     <AppleTouchFeedback
//                       onPress={() => moveSource(src.name, 'down')}
//                       hapticStyle="selection"
//                       style={{
//                         width: 36,
//                         height: 36,
//                         borderRadius: 8,
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         backgroundColor: theme.colors.surface3,
//                         marginLeft: 4,
//                       }}>
//                       <MaterialIcons
//                         name="arrow-downward"
//                         size={18}
//                         color="#fff"
//                       />
//                     </AppleTouchFeedback>
//                   </View>

//                   {/* Read toggle (in-app feed) */}
//                   <View
//                     style={{
//                       alignItems: 'center',
//                       marginRight: 10,
//                       marginBottom: 14,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Read
//                     </Text>
//                     <Switch
//                       value={!!src.enabled}
//                       onValueChange={v => {
//                         triggerSelection();
//                         toggleSource(src.id, v);
//                       }}
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   {/* Notify toggle (push) */}
//                   <View
//                     style={{
//                       alignItems: 'center',
//                       marginRight: 10,
//                       marginBottom: 14,
//                     }}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Notify
//                     </Text>
//                     <Switch
//                       value={notifyOn}
//                       onValueChange={v => {
//                         triggerSelection();
//                         v ? followSource(src.name) : unfollowSource(src.name);
//                       }}
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   <AppleTouchFeedback
//                     onPress={() => removeSource(src.id)}
//                     style={styles.removeBtn}
//                     hapticStyle="impactLight">
//                     <Text style={styles.removeText}>Remove</Text>
//                   </AppleTouchFeedback>
//                 </View>
//               );
//             })}

//             <View style={styles.addBox}>
//               <Text style={styles.addTitle}>Add Feed</Text>
//               {!!addError && <Text style={styles.addError}>{addError}</Text>}
//               <TextInput
//                 value={newName}
//                 onChangeText={setNewName}
//                 placeholder="Display name (optional)"
//                 placeholderTextColor={theme.colors.muted}
//                 style={styles.input}
//               />
//               <TextInput
//                 value={newUrl}
//                 onChangeText={setNewUrl}
//                 placeholder="Feed URL (https://…)"
//                 placeholderTextColor={theme.colors.muted}
//                 autoCapitalize="none"
//                 autoCorrect={false}
//                 style={styles.input}
//               />
//               <AppleTouchFeedback
//                 hapticStyle="impactMedium"
//                 onPress={() => {
//                   setAddError(null);
//                   try {
//                     addSource(newName, newUrl);
//                     setNewName('');
//                     setNewUrl('');
//                   } catch (e: any) {
//                     setAddError(e?.message ?? 'Could not add feed');
//                   }
//                 }}
//                 style={styles.addBtn}>
//                 <Text style={styles.addBtnText}>Add Feed</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetToDefaults}
//                 style={styles.resetBtn}>
//                 <Text style={styles.resetText}>Reset to Defaults</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetSourceOrderAZ}
//                 style={[styles.resetBtn, {marginTop: 8}]}>
//                 <Text style={styles.resetText}>Reset Order (A–Z)</Text>
//               </AppleTouchFeedback>
//             </View>
//           </ScrollView>
//         </View>
//       </Modal>

//       {/* Brands modal */}
//       <Modal
//         visible={manageBrandsOpen}
//         animationType="slide"
//         onRequestClose={() => setManageBrandsOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Brands</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setManageBrandsOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>
//           <View style={{padding: 12}}>
//             <TextInput
//               value={brandSearch}
//               onChangeText={setBrandSearch}
//               placeholder="Search your wardrobe brands…"
//               placeholderTextColor={theme.colors.muted}
//               style={styles.input}
//             />
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {wardrobeBrands.length === 0 ? (
//               <View style={{paddingHorizontal: 12, paddingTop: 8}}>
//                 <Text style={{color: 'rgba(255,255,255,0.7)'}}>
//                   No brands found yet. Add items to your wardrobe (with a brand)
//                   and they’ll show up here as chips you can toggle.
//                 </Text>
//               </View>
//             ) : (
//               Array.from(
//                 new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//               )
//                 .filter(
//                   b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//                 )
//                 .map(brand => {
//                   const show = chipAllowlist[brand] !== false;
//                   return (
//                     <View key={brand} style={styles.sourceRow}>
//                       <View style={{flex: 1}}>
//                         <Text style={styles.sourceName}>{brand}</Text>
//                       </View>
//                       <Text style={{color: '#fff', marginRight: 8}}>
//                         Visible
//                       </Text>
//                       <Switch
//                         value={show}
//                         onValueChange={v => {
//                           triggerSelection();
//                           setChipAllowlist(prev => ({...prev, [brand]: v}));
//                         }}
//                         trackColor={{
//                           false: 'rgba(255,255,255,0.18)',
//                           true: '#0A84FF',
//                         }}
//                         thumbColor="#fff"
//                       />
//                     </View>
//                   );
//                 })
//             )}
//           </ScrollView>
//         </View>
//       </Modal>

//       <Modal
//         visible={menuOpen}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setMenuOpen(false)}>
//         {/* Root layer */}
//         <View style={styles.menuBackdrop}>
//           {/* Backdrop: closes on tap */}
//           <ScrollView
//             // a full-screen, non-scrolling layer that can receive the tap
//             style={StyleSheet.absoluteFillObject}
//             contentContainerStyle={{flex: 1}}
//             scrollEnabled={false}
//             onTouchStart={() => setMenuOpen(false)}
//           />

//           {/* Sheet: on top; taps DO NOT close */}
//           <View style={styles.menuSheet}>
//             <Text style={styles.menuTitle}>Manage</Text>

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setNotifOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Notifications</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageBrandsOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Brands</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Feeds</Text>
//             </AppleTouchFeedback>
//           </View>
//         </View>
//       </Modal>

//       {/* Notifications prefs modal */}
//       <Modal
//         visible={notifOpen}
//         animationType="slide"
//         onRequestClose={() => setNotifOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Notifications</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setNotifOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>

//           <ScrollView contentContainerStyle={{padding: 16, gap: 14}}>
//             <RowToggle
//               label="Enable Push"
//               value={pushEnabled}
//               onChange={async v => {
//                 triggerSelection();
//                 setPushEnabled(v);
//                 await AsyncStorage.setItem(
//                   'notificationsEnabled',
//                   v ? 'true' : 'false',
//                 );
//                 savePrefs({push_enabled: v});
//                 // init handled by effect after prefsLoaded
//               }}
//             />
//             <RowToggle
//               label="Realtime for Following"
//               value={followingRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setFollowingRealtime(v);
//                 savePrefs({following_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Realtime for Brands (For You)"
//               value={brandsRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setBrandsRealtime(v);
//                 savePrefs({brands_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Breaking Fashion News"
//               value={breakingRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setBreakingRealtime(v);
//                 savePrefs({breaking_realtime: v});
//               }}
//             />

//             <View style={{gap: 6}}>
//               <Text style={{color: '#fff', fontWeight: '700'}}>
//                 Daily Digest Hour (0–23)
//               </Text>
//               <TextInput
//                 value={String(digestHour)}
//                 onChangeText={txt => {
//                   const n = Math.max(0, Math.min(23, Number(txt) || 0));
//                   setDigestHour(n);
//                 }}
//                 onEndEditing={() => savePrefs({digest_hour: digestHour})}
//                 keyboardType="number-pad"
//                 placeholder="8"
//                 placeholderTextColor="rgba(255,255,255,0.4)"
//                 style={styles.input}
//               />
//             </View>
//           </ScrollView>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// function RowToggle({
//   label,
//   value,
//   onChange,
// }: {
//   label: string;
//   value: boolean;
//   onChange: (v: boolean) => void;
// }) {
//   return (
//     <View style={styles.rowToggle}>
//       <Text style={styles.rowToggleLabel}>{label}</Text>
//       <Switch
//         value={value}
//         onValueChange={v => {
//           ReactNativeHapticFeedback.trigger('selection', {
//             enableVibrateFallback: true,
//             ignoreAndroidSystemSettings: false,
//           });
//           onChange(v);
//         }}
//         trackColor={{false: 'rgba(255,255,255,0.18)', true: '#0A84FF'}}
//         thumbColor="#fff"
//       />
//     </View>
//   );
// }

// function Segmented({tab, onChange}: {tab: Tab; onChange: (t: Tab) => void}) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const seg = StyleSheet.create({
//     root: {
//       height: 36,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 10,
//       padding: 3,
//       flexDirection: 'row',
//       flex: 1,
//       maxWidth: 280,
//     },
//     itemWrap: {
//       flex: 1,
//       borderRadius: 8,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     itemActive: {backgroundColor: theme.colors.background},
//     itemText: {color: theme.colors.foreground3, fontWeight: '700'},
//     itemTextActive: {color: theme.colors.foreground},
//   });

//   return (
//     <View style={seg.root}>
//       {(['For You', 'Following'] as Tab[]).map(t => {
//         const active = t === tab;
//         return (
//           <View key={t} style={[seg.itemWrap, active && seg.itemActive]}>
//             <AppleTouchFeedback
//               hapticStyle={active ? undefined : 'impactLight'}
//               onPress={() => onChange(t)}
//               style={{
//                 paddingVertical: 6,
//                 paddingHorizontal: 8,
//                 borderRadius: 8,
//               }}>
//               <Text style={[seg.itemText, active && seg.itemTextActive]}>
//                 {t}
//               </Text>
//             </AppleTouchFeedback>
//           </View>
//         );
//       })}
//     </View>
//   );
// }

///////////////////////

// import React, {useEffect, useMemo, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   RefreshControl,
//   Modal,
//   TextInput,
//   Switch,
//   Alert,
//   Platform,
// } from 'react-native';
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// dayjs.extend(relativeTime);

// import FeaturedHero from '../components/FashionFeed/FeaturedHero';
// import ArticleCard from '../components/FashionFeed/ArticleCard';
// import TrendChips from '../components/FashionFeed/TrendChips';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {useFashionFeeds} from '../hooks/useFashionFeeds';
// import {useFeedSources, FeedSource} from '../hooks/useFeedSources';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {initializeNotifications} from '../utils/notificationService';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {useAppTheme} from '../context/ThemeContext';
// import messaging from '@react-native-firebase/messaging';
// import PushNotification from 'react-native-push-notification';
// import {addNotification} from '../storage/notifications';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Tab = 'For You' | 'Following';

// type Chip = {
//   id: string;
//   label: string;
//   type: 'personal' | 'trending' | 'context' | 'source';
//   filter: {topics?: string[]; sources?: string[]; constraints?: any};
// };

// const triggerSelection = () =>
//   ReactNativeHapticFeedback.trigger('selection', {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function ExploreScreen() {
//   const userId = useUUID() ?? '';

//   const {
//     sources,
//     enabled,
//     loading: sourcesLoading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//   } = useFeedSources({userId});

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     container: {flex: 1, backgroundColor: theme.colors.background},
//     sourceUrl: {color: theme.colors.foreground, fontSize: 12, maxWidth: 240},
//     removeBtn: {
//       marginLeft: 6,
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: theme.colors.surface,
//     },
//     removeText: {
//       color: theme.colors.foreground,
//       fontWeight: '700',
//       fontSize: 12,
//     },
//     addBox: {padding: 16, gap: 8},
//     addTitle: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 16,
//       marginBottom: 4,
//     },
//     addError: {color: '#FF453A', fontSize: 12, marginBottom: 2},
//     addBtn: {
//       marginTop: 8,
//       backgroundColor: theme.colors.button1,
//       borderRadius: 10,
//       paddingVertical: 10,
//       alignItems: 'center',
//     },
//     addBtnText: {color: theme.colors.foreground, fontWeight: '800'},
//     resetBtn: {
//       marginTop: 8,
//       backgroundColor: 'rgba(255,255,255,0.08)',
//       borderRadius: 10,
//       paddingVertical: 10,
//       alignItems: 'center',
//     },
//     resetText: {color: 'rgba(255,255,255,0.9)', fontWeight: '700'},
//     topBar: {
//       paddingTop: 14,
//       paddingHorizontal: 16,
//       paddingBottom: 6,
//       backgroundColor: theme.colors.background,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconBtn: {
//       marginLeft: 8,
//       width: 36,
//       height: 36,
//       borderRadius: 10,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.button1,
//     },
//     iconBtnText: {
//       color: theme.colors.foreground,
//       fontWeight: '900',
//       fontSize: 20,
//       lineHeight: 20,
//       marginTop: -2,
//     },

//     menuBackdrop: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       justifyContent: 'flex-start',
//       alignItems: 'flex-end',
//     },
//     menuSheet: {
//       marginTop: 60,
//       marginRight: 12,
//       width: 200,
//       backgroundColor: '#111',
//       borderRadius: 12,
//       paddingVertical: 8,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 10,
//       shadowOffset: {width: 0, height: 8},
//       elevation: 8,
//     },
//     menuTitle: {
//       color: 'rgba(255,255,255,0.7)',
//       fontSize: 12,
//       fontWeight: '700',
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//     },
//     menuItem: {
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//     },
//     menuItemText: {
//       color: '#fff',
//       fontWeight: '700',
//     },
//     manageBtn: {
//       marginLeft: 'auto',
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: 'rgba(89, 0, 255, 1)',
//     },
//     manageText: {color: theme.colors.foreground, fontWeight: '700'},
//     sectionHeader: {
//       paddingHorizontal: 16,
//       paddingVertical: 8,
//       backgroundColor: theme.colors.background,
//     },
//     sectionTitle: {
//       color: theme.colors.button1,
//       fontWeight: '800',
//       fontSize: 20,
//     },
//     modalRoot: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       marginTop: 80,
//     },
//     modalHeader: {
//       height: 48,
//       borderBottomColor: 'rgba(255,255,255,0.1)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       paddingHorizontal: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     modalTitle: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//     },
//     done: {color: '#5900ffff', fontWeight: '700'},
//     sourceRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 10,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       borderBottomColor: 'rgba(255,255,255,0.06)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//     },
//     sourceName: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       fontWeight: '700',
//       padding: 0,
//       marginBottom: 2,
//     },
//     input: {
//       backgroundColor: 'rgba(255,255,255,0.06)',
//       borderRadius: 10,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       color: theme.colors.foreground,
//     },
//     rowToggle: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       backgroundColor: 'rgba(255,255,255,0.06)',
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//       borderRadius: 10,
//     },
//     rowToggleLabel: {color: '#fff', fontSize: 14, fontWeight: '700'},
//   });

//   // ───────── Tabs control which feeds we pull ─────────
//   const [tab, setTab] = useState<Tab>('For You');
//   const feedsForTab = tab === 'Following' ? enabled : sources;

//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);
//   const [menuOpen, setMenuOpen] = useState(false);

//   const {articles, loading, refresh} = useFashionFeeds(
//     feedsForTab.map(fs => ({name: fs.name, url: fs.url})),
//     {userId},
//   );

//   // ───────── Notifications: follows + preferences ─────────
//   const [notifOpen, setNotifOpen] = useState(false);
//   const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
//   const [pushEnabled, setPushEnabled] = useState(true);
//   const [followingRealtime, setFollowingRealtime] = useState(false);
//   const [brandsRealtime, setBrandsRealtime] = useState(false);
//   const [breakingRealtime, setBreakingRealtime] = useState(true);
//   const [digestHour, setDigestHour] = useState<number>(8);
//   const [prefsLoaded, setPrefsLoaded] = useState(false); // gate init

//   // === OPEN FROM NOTIFICATION -> open Reader ===
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const openFromNotification = (data: any) => {
//     if (!data) return;
//     if (data.type === 'article' && data.url) {
//       setTab('For You');
//       setOpenUrl(data.url);
//       setOpenTitle(data.title || data.source || '');
//     }
//     if (data.type === 'test') {
//       setTab('For You');
//     }
//   };

//   const sendLocalTestNotification = async () => {
//     const title = 'Inbox test';
//     const message = 'This should appear in Notifications.';
//     const deeplink = 'myapp://news/123'; // optional

//     // save to your in-app inbox (what the Notifications screen reads)
//     await addNotification(userId, {
//       title,
//       message,
//       deeplink,
//       category: 'news',
//       data: {type: 'test'},
//     });

//     // (optional) show an OS banner so you also see a toast
//     try {
//       PushNotification.localNotification({
//         channelId: 'style-channel',
//         title,
//         message,
//         playSound: true,
//         soundName: 'default',
//       });
//     } catch {}
//   };

//   // Listeners to handle push taps / foreground messages
//   useEffect(() => {
//     // App in background → user taps the push
//     const unsubOpened = messaging().onNotificationOpenedApp(msg => {
//       if (msg?.data) openFromNotification(msg.data);
//     });

//     // App was quit → opened from a push
//     messaging()
//       .getInitialNotification()
//       .then(msg => {
//         if (msg?.data) openFromNotification(msg.data);
//       });

//     // App in foreground → play chime via local notification (+ optional prompt)
//     const unsubForeground = messaging().onMessage(async msg => {
//       const d = msg?.data || {};

//       // Make a local notification so iOS/Android will play a sound in-foreground
//       try {
//         PushNotification.localNotification({
//           channelId: 'style-channel', // must match created channel
//           title: msg.notification?.title ?? d.source ?? 'Fashion Feed',
//           message: msg.notification?.body ?? d.title ?? 'New article',
//           playSound: true,
//           soundName: 'default',
//           userInfo: d, // if you later handle taps via PushNotification.configure
//         });
//       } catch (e) {
//         console.log('⚠️ localNotification error', e);
//       }

//       // Optional: keep the in-app prompt so users can open immediately
//       if (d?.type === 'article' && d?.url) {
//         Alert.alert(
//           msg.notification?.title ?? 'Fashion Feed',
//           msg.notification?.body ?? 'New article',
//           [
//             {text: 'Later', style: 'cancel'},
//             {text: 'Read now', onPress: () => openFromNotification(d)},
//           ],
//         );
//       }
//     });

//     return () => {
//       unsubOpened();
//       unsubForeground();
//     };
//   }, []);

//   // Register once, only after prefs loaded and push is ON
//   useEffect(() => {
//     (async () => {
//       if (!userId || !prefsLoaded) return;
//       await AsyncStorage.setItem(
//         'notificationsEnabled',
//         pushEnabled ? 'true' : 'false',
//       );
//       if (pushEnabled) {
//         await initializeNotifications(userId); // requests perms, gets token, registers
//         console.log('✅ Push initialized & token registration attempted');
//       } else {
//         console.log('🔕 Push disabled locally');
//       }
//     })();
//   }, [userId, prefsLoaded, pushEnabled]);

//   // Load follows
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/follows?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         );
//         const json = await res.json();
//         const list: string[] = Array.isArray(json?.sources) ? json.sources : [];
//         setFollowingSet(new Set(list.map(s => s.toLowerCase())));
//       } catch (e) {
//         console.log('⚠️ load follows failed', e);
//       }
//     })();
//   }, [userId]);

//   // Load preferences (and mirror the local flag so initialize can run)
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/preferences/get?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         ).catch(() => null);

//         const json =
//           (await res?.json().catch(() => null)) ??
//           (await (
//             await fetch(`${API_BASE_URL}/notifications/preferences`, {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify({user_id: userId}),
//             })
//           ).json());

//         if (json) {
//           const pe = json.push_enabled ?? true;
//           setPushEnabled(pe);
//           setFollowingRealtime(json.following_realtime ?? false);
//           setBrandsRealtime(json.brands_realtime ?? false);
//           setBreakingRealtime(json.breaking_realtime ?? true);
//           setDigestHour(Number(json.digest_hour ?? 8));

//           await AsyncStorage.setItem(
//             'notificationsEnabled',
//             pe ? 'true' : 'false',
//           );
//         }
//       } catch (e) {
//         console.log('⚠️ load prefs failed', e);
//       } finally {
//         setPrefsLoaded(true); // allow init effect to run
//       }
//     })();
//   }, [userId]);

//   const savePrefs = async (
//     overrides?: Partial<{
//       push_enabled: boolean;
//       following_realtime: boolean;
//       brands_realtime: boolean;
//       breaking_realtime: boolean;
//       digest_hour: number;
//     }>,
//   ) => {
//     try {
//       const payload = {
//         user_id: userId,
//         push_enabled: pushEnabled,
//         following_realtime: followingRealtime,
//         brands_realtime: brandsRealtime,
//         breaking_realtime: breakingRealtime,
//         digest_hour: digestHour,
//         ...(overrides ?? {}),
//       };
//       await fetch(`${API_BASE_URL}/notifications/preferences`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });
//     } catch (e) {
//       console.log('⚠️ save prefs failed', e);
//     }
//   };

//   const followSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => new Set([...prev, key])); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/follow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => {
//         const copy = new Set(prev);
//         copy.delete(key);
//         return copy;
//       });
//     }
//   };

//   const unfollowSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => {
//       const copy = new Set(prev);
//       copy.delete(key);
//       return copy;
//     }); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/unfollow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => new Set([...prev, key]));
//     }
//   };

//   // ───────── Personal chips ─────────
//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/wardrobe/brands/${userId}`);
//         const json = await res.json();
//         setWardrobeBrands(Array.isArray(json?.brands) ? json.brands : []);
//       } catch {
//         setWardrobeBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ───────── Trending chips ─────────
//   const trendingKeywords = useMemo(() => {
//     if (!articles?.length) return [];
//     const wordCounts: Record<string, number> = {};
//     for (const a of articles) {
//       const text = `${a.title ?? ''} ${a.summary ?? ''}`.toLowerCase();
//       text.split(/\W+/).forEach(w => {
//         if (w.length > 3) wordCounts[w] = (wordCounts[w] ?? 0) + 1;
//       });
//     }
//     return Object.entries(wordCounts)
//       .sort((a, b) => b[1] - a[1])
//       .map(([w]) => w)
//       .slice(0, 10);
//   }, [articles]);

//   // ───────── Context chips ─────────
//   const [weather, setWeather] = useState('hot');
//   useEffect(() => {
//     setWeather('hot'); // placeholder; swap with real weather call
//   }, []);

//   // ───────── Combine chips ─────────
//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [chips, setChips] = useState<Chip[]>([]);
//   useEffect(() => {
//     const personal = wardrobeBrands
//       .filter(b => chipAllowlist[b] !== false)
//       .slice(0, 6)
//       .map(b => ({
//         id: 'brand-' + b.toLowerCase(),
//         label: b,
//         type: 'personal' as const,
//         filter: {topics: [b.toLowerCase()]},
//       }));

//     const trending = trendingKeywords.map(t => ({
//       id: 'trend-' + t.toLowerCase(),
//       label: t,
//       type: 'trending' as const,
//       filter: {topics: [t]},
//     }));

//     const context = [
//       {
//         id: 'ctx-weather',
//         label: `Weather: ${weather}`,
//         type: 'context' as const,
//         filter: {constraints: {weather}},
//       },
//     ];

//     const sourceChips: Chip[] = enabled.map(es => ({
//       id: 'src-' + es.name.toLowerCase(),
//       label: es.name,
//       type: 'source',
//       filter: {sources: [es.name]},
//     }));

//     setChips([...sourceChips, ...personal, ...trending, ...context]);
//   }, [wardrobeBrands, trendingKeywords, weather, enabled, chipAllowlist]);

//   const [brandSearch, setBrandSearch] = useState('');

//   // active chip selection
//   const [activeChipLabel, setActiveChipLabel] = useState<string | null>(null);
//   const activeFilter =
//     chips.find(
//       c => c.label.toLowerCase() === (activeChipLabel ?? '').toLowerCase(),
//     )?.filter ?? null;

//   // ───────── HERO + LIST BY TAB ─────────
//   const articlesChrono = useMemo(
//     () =>
//       [...articles].sort(
//         (a, b) =>
//           (dayjs(b.publishedAt).valueOf() || 0) -
//           (dayjs(a.publishedAt).valueOf() || 0),
//       ),
//     [articles],
//   );

//   const hero = tab === 'Following' ? articlesChrono[0] : articles[0];

//   const restBase = useMemo(() => {
//     if (tab === 'Following') {
//       return articlesChrono.slice(1);
//     }
//     return articles.length > 1 ? articles.slice(1) : [];
//   }, [tab, articles, articlesChrono]);

//   const filteredForYou = useMemo(() => {
//     if (!activeFilter) return restBase;

//     const hasTopics = !!activeFilter.topics?.length;
//     const hasSources = !!activeFilter.sources?.length;

//     return restBase.filter(a => {
//       const sourceOk = !hasSources
//         ? true
//         : activeFilter.sources!.some(
//             src => src.toLowerCase() === a.source.toLowerCase(),
//           );

//       const topicOk = !hasTopics
//         ? true
//         : [a.title, a.source, a.summary].some(x =>
//             activeFilter.topics!.some(t =>
//               (x || '').toLowerCase().includes(t.toLowerCase()),
//             ),
//           );

//       return sourceOk && topicOk;
//     });
//   }, [restBase, activeFilter]);

//   const list = tab === 'For You' ? filteredForYou : restBase;

//   const [manageOpen, setManageOpen] = useState(false);
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

//   // === Send a REAL article push for testing (kept for dev) ===
//   const sendTestPush = async () => {
//     try {
//       const candidate = hero || list?.[0];
//       const data = {
//         type: 'article',
//         article_id: String(candidate?.id ?? Date.now()),
//         url: candidate?.link ?? 'https://www.vogue.com/',
//         title: candidate?.title ?? 'Fashion test article',
//         source: candidate?.source ?? 'Fashion Feed',
//       };

//       const res = await fetch(`${API_BASE_URL}/notifications/test`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           title: data.source,
//           body: data.title,
//           data,
//         }),
//       });
//       const json = await res.json();
//       Alert.alert(
//         'Push sent',
//         `Devices notified: ${json.sent ?? json.notifications_sent ?? 0}`,
//       );
//     } catch (e) {
//       Alert.alert('Push failed', String(e));
//     }
//   };

//   return (
//     <View>
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl
//             refreshing={loading || sourcesLoading}
//             onRefresh={refresh}
//             tintColor="#fff"
//           />
//         }
//         contentContainerStyle={[
//           globalStyles.container,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}>Fashion News</Text>
//         </View>

//         <View style={styles.topBar}>
//           <Segmented
//             tab={tab}
//             onChange={t => {
//               triggerSelection();
//               setTab(t);
//             }}
//           />
//           <AppleTouchFeedback
//             onPress={() => setMenuOpen(true)}
//             style={styles.iconBtn}
//             hapticStyle="impactLight"
//             accessibilityLabel="Manage">
//             <Text style={styles.iconBtnText}>⋯</Text>
//           </AppleTouchFeedback>
//         </View>

//         {hero && (
//           <FeaturedHero
//             title={hero.title}
//             source={hero.source}
//             image={hero.image}
//             onPress={() => {
//               // Tap-to-open article: light impact
//               // (Add haptic inside FeaturedHero if you prefer it local)
//               setOpenUrl(hero.link);
//               setOpenTitle(hero.title);
//             }}
//           />
//         )}

//         {tab === 'For You' && (
//           <TrendChips
//             items={chips.map(c => c.label)}
//             selected={activeChipLabel}
//             onTap={label => {
//               triggerSelection();
//               setActiveChipLabel(prev =>
//                 prev?.toLowerCase() === label.toLowerCase() ? null : label,
//               );
//             }}
//             onMore={() => {
//               triggerSelection();
//               setManageBrandsOpen(true);
//             }}
//           />
//         )}

//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>
//             {tab === 'For You' ? 'Recommended for you' : 'Following'}
//           </Text>
//         </View>

//         <View style={[{paddingHorizontal: 16}]}>
//           {list.map(item => (
//             <ArticleCard
//               key={item.id}
//               title={item.title}
//               source={item.source}
//               image={item.image}
//               time={
//                 item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//               }
//               onPress={() => {
//                 // Tap-to-open article: light impact
//                 setOpenUrl(item.link);
//                 setOpenTitle(item.title);
//               }}
//             />
//           ))}
//         </View>

//         {tab === 'For You' && wardrobeBrands.length === 0 && (
//           <View style={{paddingHorizontal: 16, paddingTop: 8}}>
//             <Text style={{color: 'rgba(255,255,255,0.6)', fontSize: 12}}>
//               No wardrobe brands detected yet. Add items to your wardrobe to
//               unlock personalized brand chips.
//             </Text>
//           </View>
//         )}
//       </ScrollView>

//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* Feeds modal */}
//       <Modal
//         visible={manageOpen}
//         animationType="slide"
//         onRequestClose={() => setManageOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Feeds</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setManageOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {sources.map((src: FeedSource) => {
//               const notifyOn = followingSet.has(src.name.toLowerCase());
//               return (
//                 <View key={src.id} style={styles.sourceRow}>
//                   <View style={{flex: 1}}>
//                     <TextInput
//                       defaultValue={src.name}
//                       placeholder="Name"
//                       placeholderTextColor="rgba(255,255,255,0.4)"
//                       onEndEditing={e =>
//                         renameSource(src.id, e.nativeEvent.text)
//                       }
//                       style={styles.sourceName}
//                     />
//                     <Text style={styles.sourceUrl} numberOfLines={1}>
//                       {src.url}
//                     </Text>
//                   </View>

//                   {/* Read toggle (in-app feed) */}
//                   <View style={{alignItems: 'center', marginRight: 10}}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Read
//                     </Text>
//                     <Switch
//                       value={!!src.enabled}
//                       onValueChange={v => {
//                         triggerSelection();
//                         toggleSource(src.id, v);
//                       }}
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   {/* Notify toggle (push) */}
//                   <View style={{alignItems: 'center', marginRight: 10}}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Notify
//                     </Text>
//                     <Switch
//                       value={notifyOn}
//                       onValueChange={v => {
//                         triggerSelection();
//                         v ? followSource(src.name) : unfollowSource(src.name);
//                       }}
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   <AppleTouchFeedback
//                     onPress={() => removeSource(src.id)}
//                     style={styles.removeBtn}
//                     hapticStyle="impactLight">
//                     <Text style={styles.removeText}>Remove</Text>
//                   </AppleTouchFeedback>
//                 </View>
//               );
//             })}

//             <View style={styles.addBox}>
//               <Text style={styles.addTitle}>Add Feed</Text>
//               {!!addError && <Text style={styles.addError}>{addError}</Text>}
//               <TextInput
//                 value={newName}
//                 onChangeText={setNewName}
//                 placeholder="Display name (optional)"
//                 placeholderTextColor="rgba(255,255,255,0.4)"
//                 style={styles.input}
//               />
//               <TextInput
//                 value={newUrl}
//                 onChangeText={setNewUrl}
//                 placeholder="Feed URL (https://…)"
//                 placeholderTextColor="rgba(255,255,255,0.4)"
//                 autoCapitalize="none"
//                 autoCorrect={false}
//                 style={styles.input}
//               />
//               <AppleTouchFeedback
//                 hapticStyle="impactMedium"
//                 onPress={() => {
//                   setAddError(null);
//                   try {
//                     addSource(newName, newUrl);
//                     setNewName('');
//                     setNewUrl('');
//                   } catch (e: any) {
//                     setAddError(e?.message ?? 'Could not add feed');
//                   }
//                 }}
//                 style={styles.addBtn}>
//                 <Text style={styles.addBtnText}>Add Feed</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetToDefaults}
//                 style={styles.resetBtn}>
//                 <Text style={styles.resetText}>Reset to Defaults</Text>
//               </AppleTouchFeedback>
//             </View>
//           </ScrollView>
//         </View>
//       </Modal>

//       {/* Brands modal */}
//       <Modal
//         visible={manageBrandsOpen}
//         animationType="slide"
//         onRequestClose={() => setManageBrandsOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Brands</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setManageBrandsOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>
//           <View style={{padding: 12}}>
//             <TextInput
//               value={brandSearch}
//               onChangeText={setBrandSearch}
//               placeholder="Search your wardrobe brands…"
//               placeholderTextColor="rgba(255,255,255,0.4)"
//               style={styles.input}
//             />
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {wardrobeBrands.length === 0 ? (
//               <View style={{paddingHorizontal: 12, paddingTop: 8}}>
//                 <Text style={{color: 'rgba(255,255,255,0.7)'}}>
//                   No brands found yet. Add items to your wardrobe (with a brand)
//                   and they’ll show up here as chips you can toggle.
//                 </Text>
//               </View>
//             ) : (
//               Array.from(
//                 new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//               )
//                 .filter(
//                   b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//                 )
//                 .map(brand => {
//                   const show = chipAllowlist[brand] !== false;
//                   return (
//                     <View key={brand} style={styles.sourceRow}>
//                       <View style={{flex: 1}}>
//                         <Text style={styles.sourceName}>{brand}</Text>
//                       </View>
//                       <Text style={{color: '#fff', marginRight: 8}}>
//                         Visible
//                       </Text>
//                       <Switch
//                         value={show}
//                         onValueChange={v => {
//                           triggerSelection();
//                           setChipAllowlist(prev => ({...prev, [brand]: v}));
//                         }}
//                         trackColor={{
//                           false: 'rgba(255,255,255,0.18)',
//                           true: '#0A84FF',
//                         }}
//                         thumbColor="#fff"
//                       />
//                     </View>
//                   );
//                 })
//             )}
//           </ScrollView>
//         </View>
//       </Modal>

//       <Modal
//         visible={menuOpen}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setMenuOpen(false)}>
//         {/* Root layer */}
//         <View style={styles.menuBackdrop}>
//           {/* Backdrop: closes on tap */}
//           <ScrollView
//             // a full-screen, non-scrolling layer that can receive the tap
//             style={StyleSheet.absoluteFillObject}
//             contentContainerStyle={{flex: 1}}
//             scrollEnabled={false}
//             onTouchStart={() => setMenuOpen(false)}
//           />

//           {/* Sheet: on top; taps DO NOT close */}
//           <View style={styles.menuSheet}>
//             <Text style={styles.menuTitle}>Manage</Text>

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setNotifOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Notifications</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageBrandsOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Brands</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.menuItem}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Feeds</Text>
//             </AppleTouchFeedback>
//           </View>
//         </View>
//       </Modal>

//       {/* Notifications prefs modal */}
//       <Modal
//         visible={notifOpen}
//         animationType="slide"
//         onRequestClose={() => setNotifOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Notifications</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={() => setNotifOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </AppleTouchFeedback>
//           </View>

//           <ScrollView contentContainerStyle={{padding: 16, gap: 14}}>
//             <RowToggle
//               label="Enable Push"
//               value={pushEnabled}
//               onChange={async v => {
//                 triggerSelection();
//                 setPushEnabled(v);
//                 await AsyncStorage.setItem(
//                   'notificationsEnabled',
//                   v ? 'true' : 'false',
//                 );
//                 savePrefs({push_enabled: v});
//                 // init handled by effect after prefsLoaded
//               }}
//             />
//             <RowToggle
//               label="Realtime for Following"
//               value={followingRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setFollowingRealtime(v);
//                 savePrefs({following_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Realtime for Brands (For You)"
//               value={brandsRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setBrandsRealtime(v);
//                 savePrefs({brands_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Breaking Fashion News"
//               value={breakingRealtime}
//               onChange={v => {
//                 triggerSelection();
//                 setBreakingRealtime(v);
//                 savePrefs({breaking_realtime: v});
//               }}
//             />

//             <View style={{gap: 6}}>
//               <Text style={{color: '#fff', fontWeight: '700'}}>
//                 Daily Digest Hour (0–23)
//               </Text>
//               <TextInput
//                 value={String(digestHour)}
//                 onChangeText={txt => {
//                   const n = Math.max(0, Math.min(23, Number(txt) || 0));
//                   setDigestHour(n);
//                 }}
//                 onEndEditing={() => savePrefs({digest_hour: digestHour})}
//                 keyboardType="number-pad"
//                 placeholder="8"
//                 placeholderTextColor="rgba(255,255,255,0.4)"
//                 style={styles.input}
//               />
//             </View>
//           </ScrollView>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// function RowToggle({
//   label,
//   value,
//   onChange,
// }: {
//   label: string;
//   value: boolean;
//   onChange: (v: boolean) => void;
// }) {
//   return (
//     <View style={styles.rowToggle}>
//       <Text style={styles.rowToggleLabel}>{label}</Text>
//       <Switch
//         value={value}
//         onValueChange={v => {
//           ReactNativeHapticFeedback.trigger('selection', {
//             enableVibrateFallback: true,
//             ignoreAndroidSystemSettings: false,
//           });
//           onChange(v);
//         }}
//         trackColor={{false: 'rgba(255,255,255,0.18)', true: '#0A84FF'}}
//         thumbColor="#fff"
//       />
//     </View>
//   );
// }

// function Segmented({tab, onChange}: {tab: Tab; onChange: (t: Tab) => void}) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const seg = StyleSheet.create({
//     root: {
//       height: 36,
//       backgroundColor: 'rgba(73, 73, 73, 1)',
//       borderRadius: 10,
//       padding: 3,
//       flexDirection: 'row',
//       flex: 1,
//       maxWidth: 280,
//     },
//     itemWrap: {
//       flex: 1,
//       borderRadius: 8,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     itemActive: {backgroundColor: theme.colors.background},
//     itemText: {color: theme.colors.foreground3, fontWeight: '700'},
//     itemTextActive: {color: theme.colors.foreground},
//   });

//   return (
//     <View style={seg.root}>
//       {(['For You', 'Following'] as Tab[]).map(t => {
//         const active = t === tab;
//         return (
//           <View key={t} style={[seg.itemWrap, active && seg.itemActive]}>
//             <AppleTouchFeedback
//               hapticStyle={active ? undefined : 'impactLight'}
//               onPress={() => onChange(t)}
//               style={{
//                 paddingVertical: 6,
//                 paddingHorizontal: 8,
//                 borderRadius: 8,
//               }}>
//               <Text style={[seg.itemText, active && seg.itemTextActive]}>
//                 {t}
//               </Text>
//             </AppleTouchFeedback>
//           </View>
//         );
//       })}
//     </View>
//   );
// }

////////////////////////

// import React, {useEffect, useMemo, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   RefreshControl,
//   Modal,
//   TextInput,
//   TouchableOpacity,
//   Switch,
//   Alert,
//   Platform,
// } from 'react-native';
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// dayjs.extend(relativeTime);

// import FeaturedHero from '../components/FashionFeed/FeaturedHero';
// import ArticleCard from '../components/FashionFeed/ArticleCard';
// import TrendChips from '../components/FashionFeed/TrendChips';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {useFashionFeeds} from '../hooks/useFashionFeeds';
// import {useFeedSources, FeedSource} from '../hooks/useFeedSources';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {initializeNotifications} from '../utils/notificationService';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {useAppTheme} from '../context/ThemeContext';
// import messaging from '@react-native-firebase/messaging';
// import PushNotification from 'react-native-push-notification';
// import {addNotification} from '../storage/notifications';

// type Tab = 'For You' | 'Following';

// type Chip = {
//   id: string;
//   label: string;
//   type: 'personal' | 'trending' | 'context' | 'source';
//   filter: {topics?: string[]; sources?: string[]; constraints?: any};
// };

// export default function ExploreScreen() {
//   const userId = useUUID() ?? '';

//   const {
//     sources,
//     enabled,
//     loading: sourcesLoading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//   } = useFeedSources({userId});

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     container: {flex: 1, backgroundColor: theme.colors.background},
//     sourceUrl: {color: theme.colors.foreground, fontSize: 12, maxWidth: 240},
//     removeBtn: {
//       marginLeft: 6,
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: theme.colors.surface,
//     },
//     removeText: {
//       color: theme.colors.foreground,
//       fontWeight: '700',
//       fontSize: 12,
//     },
//     addBox: {padding: 16, gap: 8},
//     addTitle: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 16,
//       marginBottom: 4,
//     },
//     addError: {color: '#FF453A', fontSize: 12, marginBottom: 2},
//     addBtn: {
//       marginTop: 8,
//       backgroundColor: theme.colors.button1,
//       borderRadius: 10,
//       paddingVertical: 10,
//       alignItems: 'center',
//     },
//     addBtnText: {color: theme.colors.foreground, fontWeight: '800'},
//     resetBtn: {
//       marginTop: 8,
//       backgroundColor: 'rgba(255,255,255,0.08)',
//       borderRadius: 10,
//       paddingVertical: 10,
//       alignItems: 'center',
//     },
//     resetText: {color: 'rgba(255,255,255,0.9)', fontWeight: '700'},
//     topBar: {
//       paddingTop: 14,
//       paddingHorizontal: 16,
//       paddingBottom: 6,
//       backgroundColor: theme.colors.background,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconBtn: {
//       marginLeft: 8,
//       width: 36,
//       height: 36,
//       borderRadius: 10,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.button1,
//     },
//     iconBtnText: {
//       color: theme.colors.foreground,
//       fontWeight: '900',
//       fontSize: 20,
//       lineHeight: 20,
//       marginTop: -2,
//     },

//     menuBackdrop: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       justifyContent: 'flex-start',
//       alignItems: 'flex-end',
//     },
//     menuSheet: {
//       marginTop: 60,
//       marginRight: 12,
//       width: 200,
//       backgroundColor: '#111',
//       borderRadius: 12,
//       paddingVertical: 8,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 10,
//       shadowOffset: {width: 0, height: 8},
//       elevation: 8,
//     },
//     menuTitle: {
//       color: 'rgba(255,255,255,0.7)',
//       fontSize: 12,
//       fontWeight: '700',
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//     },
//     menuItem: {
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//     },
//     menuItemText: {
//       color: '#fff',
//       fontWeight: '700',
//     },
//     manageBtn: {
//       marginLeft: 'auto',
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 8,
//       backgroundColor: 'rgba(89, 0, 255, 1)',
//     },
//     manageText: {color: theme.colors.foreground, fontWeight: '700'},
//     sectionHeader: {
//       paddingHorizontal: 16,
//       paddingVertical: 8,
//       backgroundColor: theme.colors.background,
//     },
//     // sectionTitle: {color: '#6600ffff', fontWeight: '800', fontSize: 20},
//     sectionTitle: {
//       color: theme.colors.button1,
//       fontWeight: '800',
//       fontSize: 20,
//     },
//     modalRoot: {flex: 1, backgroundColor: '#000', marginTop: 80},
//     modalHeader: {
//       height: 48,
//       borderBottomColor: 'rgba(255,255,255,0.1)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       paddingHorizontal: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     modalTitle: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//     },
//     done: {color: '#5900ffff', fontWeight: '700'},
//     sourceRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 10,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       borderBottomColor: 'rgba(255,255,255,0.06)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//     },
//     sourceName: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//       fontWeight: '700',
//       padding: 0,
//       marginBottom: 2,
//     },
//     input: {
//       backgroundColor: 'rgba(255,255,255,0.06)',
//       borderRadius: 10,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       color: theme.colors.foreground,
//     },
//     rowToggle: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       backgroundColor: 'rgba(255,255,255,0.06)',
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//       borderRadius: 10,
//     },
//     rowToggleLabel: {color: '#fff', fontSize: 14, fontWeight: '700'},
//   });

//   // ───────── Tabs control which feeds we pull ─────────
//   const [tab, setTab] = useState<Tab>('For You');
//   const feedsForTab = tab === 'Following' ? enabled : sources;

//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);
//   const [menuOpen, setMenuOpen] = useState(false);

//   const {articles, loading, refresh} = useFashionFeeds(
//     feedsForTab.map(fs => ({name: fs.name, url: fs.url})),
//     {userId},
//   );

//   // ───────── Notifications: follows + preferences ─────────
//   const [notifOpen, setNotifOpen] = useState(false);
//   const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
//   const [pushEnabled, setPushEnabled] = useState(true);
//   const [followingRealtime, setFollowingRealtime] = useState(false);
//   const [brandsRealtime, setBrandsRealtime] = useState(false);
//   const [breakingRealtime, setBreakingRealtime] = useState(true);
//   const [digestHour, setDigestHour] = useState<number>(8);
//   const [prefsLoaded, setPrefsLoaded] = useState(false); // gate init

//   // === OPEN FROM NOTIFICATION -> open Reader ===
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const openFromNotification = (data: any) => {
//     if (!data) return;
//     if (data.type === 'article' && data.url) {
//       setTab('For You');
//       setOpenUrl(data.url);
//       setOpenTitle(data.title || data.source || '');
//     }
//     if (data.type === 'test') {
//       setTab('For You');
//     }
//   };

//   const sendLocalTestNotification = async () => {
//     const title = 'Inbox test';
//     const message = 'This should appear in Notifications.';
//     const deeplink = 'myapp://news/123'; // optional

//     // save to your in-app inbox (what the Notifications screen reads)
//     await addNotification(userId, {
//       title,
//       message,
//       deeplink,
//       category: 'news',
//       data: {type: 'test'},
//     });

//     // (optional) show an OS banner so you also see a toast
//     try {
//       PushNotification.localNotification({
//         channelId: 'style-channel',
//         title,
//         message,
//         playSound: true,
//         soundName: 'default',
//       });
//     } catch {}
//   };

//   // Listeners to handle push taps / foreground messages
//   useEffect(() => {
//     // App in background → user taps the push
//     const unsubOpened = messaging().onNotificationOpenedApp(msg => {
//       if (msg?.data) openFromNotification(msg.data);
//     });

//     // App was quit → opened from a push
//     messaging()
//       .getInitialNotification()
//       .then(msg => {
//         if (msg?.data) openFromNotification(msg.data);
//       });

//     // App in foreground → play chime via local notification (+ optional prompt)
//     const unsubForeground = messaging().onMessage(async msg => {
//       const d = msg?.data || {};

//       // Make a local notification so iOS/Android will play a sound in-foreground
//       try {
//         PushNotification.localNotification({
//           channelId: 'style-channel', // must match created channel
//           title: msg.notification?.title ?? d.source ?? 'Fashion Feed',
//           message: msg.notification?.body ?? d.title ?? 'New article',
//           playSound: true,
//           soundName: 'default',
//           userInfo: d, // if you later handle taps via PushNotification.configure
//         });
//       } catch (e) {
//         console.log('⚠️ localNotification error', e);
//       }

//       // Optional: keep the in-app prompt so users can open immediately
//       if (d?.type === 'article' && d?.url) {
//         Alert.alert(
//           msg.notification?.title ?? 'Fashion Feed',
//           msg.notification?.body ?? 'New article',
//           [
//             {text: 'Later', style: 'cancel'},
//             {text: 'Read now', onPress: () => openFromNotification(d)},
//           ],
//         );
//       }
//     });

//     return () => {
//       unsubOpened();
//       unsubForeground();
//     };
//   }, []);

//   // Register once, only after prefs loaded and push is ON
//   useEffect(() => {
//     (async () => {
//       if (!userId || !prefsLoaded) return;
//       await AsyncStorage.setItem(
//         'notificationsEnabled',
//         pushEnabled ? 'true' : 'false',
//       );
//       if (pushEnabled) {
//         await initializeNotifications(userId); // requests perms, gets token, registers
//         console.log('✅ Push initialized & token registration attempted');
//       } else {
//         console.log('🔕 Push disabled locally');
//       }
//     })();
//   }, [userId, prefsLoaded, pushEnabled]);

//   // Load follows
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/follows?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         );
//         const json = await res.json();
//         const list: string[] = Array.isArray(json?.sources) ? json.sources : [];
//         setFollowingSet(new Set(list.map(s => s.toLowerCase())));
//       } catch (e) {
//         console.log('⚠️ load follows failed', e);
//       }
//     })();
//   }, [userId]);

//   // Load preferences (and mirror the local flag so initialize can run)
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/preferences/get?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         ).catch(() => null);

//         const json =
//           (await res?.json().catch(() => null)) ??
//           (await (
//             await fetch(`${API_BASE_URL}/notifications/preferences`, {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify({user_id: userId}),
//             })
//           ).json());

//         if (json) {
//           const pe = json.push_enabled ?? true;
//           setPushEnabled(pe);
//           setFollowingRealtime(json.following_realtime ?? false);
//           setBrandsRealtime(json.brands_realtime ?? false);
//           setBreakingRealtime(json.breaking_realtime ?? true);
//           setDigestHour(Number(json.digest_hour ?? 8));

//           await AsyncStorage.setItem(
//             'notificationsEnabled',
//             pe ? 'true' : 'false',
//           );
//         }
//       } catch (e) {
//         console.log('⚠️ load prefs failed', e);
//       } finally {
//         setPrefsLoaded(true); // allow init effect to run
//       }
//     })();
//   }, [userId]);

//   const savePrefs = async (
//     overrides?: Partial<{
//       push_enabled: boolean;
//       following_realtime: boolean;
//       brands_realtime: boolean;
//       breaking_realtime: boolean;
//       digest_hour: number;
//     }>,
//   ) => {
//     try {
//       const payload = {
//         user_id: userId,
//         push_enabled: pushEnabled,
//         following_realtime: followingRealtime,
//         brands_realtime: brandsRealtime,
//         breaking_realtime: breakingRealtime,
//         digest_hour: digestHour,
//         ...(overrides ?? {}),
//       };
//       await fetch(`${API_BASE_URL}/notifications/preferences`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });
//     } catch (e) {
//       console.log('⚠️ save prefs failed', e);
//     }
//   };

//   const followSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => new Set([...prev, key])); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/follow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => {
//         const copy = new Set(prev);
//         copy.delete(key);
//         return copy;
//       });
//     }
//   };

//   const unfollowSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => {
//       const copy = new Set(prev);
//       copy.delete(key);
//       return copy;
//     }); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/unfollow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => new Set([...prev, key]));
//     }
//   };

//   // ───────── Personal chips ─────────
//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/wardrobe/brands/${userId}`);
//         const json = await res.json();
//         setWardrobeBrands(Array.isArray(json?.brands) ? json.brands : []);
//       } catch {
//         setWardrobeBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ───────── Trending chips ─────────
//   const trendingKeywords = useMemo(() => {
//     if (!articles?.length) return [];
//     const wordCounts: Record<string, number> = {};
//     for (const a of articles) {
//       const text = `${a.title ?? ''} ${a.summary ?? ''}`.toLowerCase();
//       text.split(/\W+/).forEach(w => {
//         if (w.length > 3) wordCounts[w] = (wordCounts[w] ?? 0) + 1;
//       });
//     }
//     return Object.entries(wordCounts)
//       .sort((a, b) => b[1] - a[1])
//       .map(([w]) => w)
//       .slice(0, 10);
//   }, [articles]);

//   // ───────── Context chips ─────────
//   const [weather, setWeather] = useState('hot');
//   useEffect(() => {
//     setWeather('hot'); // placeholder; swap with real weather call
//   }, []);

//   // ───────── Combine chips ─────────
//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [chips, setChips] = useState<Chip[]>([]);
//   useEffect(() => {
//     const personal = wardrobeBrands
//       .filter(b => chipAllowlist[b] !== false)
//       .slice(0, 6)
//       .map(b => ({
//         id: 'brand-' + b.toLowerCase(),
//         label: b,
//         type: 'personal' as const,
//         filter: {topics: [b.toLowerCase()]},
//       }));

//     const trending = trendingKeywords.map(t => ({
//       id: 'trend-' + t.toLowerCase(),
//       label: t,
//       type: 'trending' as const,
//       filter: {topics: [t]},
//     }));

//     const context = [
//       {
//         id: 'ctx-weather',
//         label: `Weather: ${weather}`,
//         type: 'context' as const,
//         filter: {constraints: {weather}},
//       },
//     ];

//     const sourceChips: Chip[] = enabled.map(es => ({
//       id: 'src-' + es.name.toLowerCase(),
//       label: es.name,
//       type: 'source',
//       filter: {sources: [es.name]},
//     }));

//     setChips([...sourceChips, ...personal, ...trending, ...context]);
//   }, [wardrobeBrands, trendingKeywords, weather, enabled, chipAllowlist]);

//   const [brandSearch, setBrandSearch] = useState('');

//   // active chip selection
//   const [activeChipLabel, setActiveChipLabel] = useState<string | null>(null);
//   const activeFilter =
//     chips.find(
//       c => c.label.toLowerCase() === (activeChipLabel ?? '').toLowerCase(),
//     )?.filter ?? null;

//   // ───────── HERO + LIST BY TAB ─────────
//   const articlesChrono = useMemo(
//     () =>
//       [...articles].sort(
//         (a, b) =>
//           (dayjs(b.publishedAt).valueOf() || 0) -
//           (dayjs(a.publishedAt).valueOf() || 0),
//       ),
//     [articles],
//   );

//   const hero = tab === 'Following' ? articlesChrono[0] : articles[0];

//   const restBase = useMemo(() => {
//     if (tab === 'Following') {
//       return articlesChrono.slice(1);
//     }
//     return articles.length > 1 ? articles.slice(1) : [];
//   }, [tab, articles, articlesChrono]);

//   const filteredForYou = useMemo(() => {
//     if (!activeFilter) return restBase;

//     const hasTopics = !!activeFilter.topics?.length;
//     const hasSources = !!activeFilter.sources?.length;

//     return restBase.filter(a => {
//       const sourceOk = !hasSources
//         ? true
//         : activeFilter.sources!.some(
//             src => src.toLowerCase() === a.source.toLowerCase(),
//           );

//       const topicOk = !hasTopics
//         ? true
//         : [a.title, a.source, a.summary].some(x =>
//             activeFilter.topics!.some(t =>
//               (x || '').toLowerCase().includes(t.toLowerCase()),
//             ),
//           );

//       return sourceOk && topicOk;
//     });
//   }, [restBase, activeFilter]);

//   const list = tab === 'For You' ? filteredForYou : restBase;

//   const [manageOpen, setManageOpen] = useState(false);
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

//   // === Send a REAL article push for testing (kept for dev) ===
//   const sendTestPush = async () => {
//     try {
//       const candidate = hero || list?.[0];
//       const data = {
//         type: 'article',
//         article_id: String(candidate?.id ?? Date.now()),
//         url: candidate?.link ?? 'https://www.vogue.com/',
//         title: candidate?.title ?? 'Fashion test article',
//         source: candidate?.source ?? 'Fashion Feed',
//       };

//       const res = await fetch(`${API_BASE_URL}/notifications/test`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           title: data.source,
//           body: data.title,
//           data,
//         }),
//       });
//       const json = await res.json();
//       Alert.alert(
//         'Push sent',
//         `Devices notified: ${json.sent ?? json.notifications_sent ?? 0}`,
//       );
//     } catch (e) {
//       Alert.alert('Push failed', String(e));
//     }
//   };

//   return (
//     <View>
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl
//             refreshing={loading || sourcesLoading}
//             onRefresh={refresh}
//             tintColor="#fff"
//           />
//         }
//         contentContainerStyle={[
//           globalStyles.container,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}>Fashion News</Text>
//         </View>

//         <View style={styles.topBar}>
//           <Segmented tab={tab} onChange={setTab} />
//           <TouchableOpacity
//             onPress={() => setMenuOpen(true)}
//             style={styles.iconBtn}
//             accessibilityLabel="Manage">
//             <Text style={styles.iconBtnText}>⋯</Text>
//           </TouchableOpacity>
//         </View>

//         {hero && (
//           <FeaturedHero
//             title={hero.title}
//             source={hero.source}
//             image={hero.image}
//             onPress={() => {
//               setOpenUrl(hero.link);
//               setOpenTitle(hero.title);
//             }}
//           />
//         )}

//         {tab === 'For You' && (
//           <TrendChips
//             items={chips.map(c => c.label)}
//             selected={activeChipLabel}
//             onTap={label =>
//               setActiveChipLabel(prev =>
//                 prev?.toLowerCase() === label.toLowerCase() ? null : label,
//               )
//             }
//             onMore={() => setManageBrandsOpen(true)}
//           />
//         )}

//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>
//             {tab === 'For You' ? 'Recommended for you' : 'Following'}
//           </Text>
//         </View>

//         <View style={[{paddingHorizontal: 16}]}>
//           {list.map(item => (
//             <ArticleCard
//               key={item.id}
//               title={item.title}
//               source={item.source}
//               image={item.image}
//               time={
//                 item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//               }
//               onPress={() => {
//                 setOpenUrl(item.link);
//                 setOpenTitle(item.title);
//               }}
//             />
//           ))}
//         </View>

//         {tab === 'For You' && wardrobeBrands.length === 0 && (
//           <View style={{paddingHorizontal: 16, paddingTop: 8}}>
//             <Text style={{color: 'rgba(255,255,255,0.6)', fontSize: 12}}>
//               No wardrobe brands detected yet. Add items to your wardrobe to
//               unlock personalized brand chips.
//             </Text>
//           </View>
//         )}
//       </ScrollView>

//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* Feeds modal */}
//       <Modal
//         visible={manageOpen}
//         animationType="slide"
//         onRequestClose={() => setManageOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Feeds</Text>
//             <TouchableOpacity onPress={() => setManageOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </TouchableOpacity>
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {sources.map((src: FeedSource) => {
//               const notifyOn = followingSet.has(src.name.toLowerCase());
//               return (
//                 <View key={src.id} style={styles.sourceRow}>
//                   <View style={{flex: 1}}>
//                     <TextInput
//                       defaultValue={src.name}
//                       placeholder="Name"
//                       placeholderTextColor="rgba(255,255,255,0.4)"
//                       onEndEditing={e =>
//                         renameSource(src.id, e.nativeEvent.text)
//                       }
//                       style={styles.sourceName}
//                     />
//                     <Text style={styles.sourceUrl} numberOfLines={1}>
//                       {src.url}
//                     </Text>
//                   </View>

//                   {/* Read toggle (in-app feed) */}
//                   <View style={{alignItems: 'center', marginRight: 10}}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Read
//                     </Text>
//                     <Switch
//                       value={!!src.enabled}
//                       onValueChange={v => toggleSource(src.id, v)}
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   {/* Notify toggle (push) */}
//                   <View style={{alignItems: 'center', marginRight: 10}}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Notify
//                     </Text>
//                     <Switch
//                       value={notifyOn}
//                       onValueChange={v =>
//                         v ? followSource(src.name) : unfollowSource(src.name)
//                       }
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   <TouchableOpacity
//                     onPress={() => removeSource(src.id)}
//                     style={styles.removeBtn}>
//                     <Text style={styles.removeText}>Remove</Text>
//                   </TouchableOpacity>
//                 </View>
//               );
//             })}

//             <View style={styles.addBox}>
//               <Text style={styles.addTitle}>Add Feed</Text>
//               {!!addError && <Text style={styles.addError}>{addError}</Text>}
//               <TextInput
//                 value={newName}
//                 onChangeText={setNewName}
//                 placeholder="Display name (optional)"
//                 placeholderTextColor="rgba(255,255,255,0.4)"
//                 style={styles.input}
//               />
//               <TextInput
//                 value={newUrl}
//                 onChangeText={setNewUrl}
//                 placeholder="Feed URL (https://…)"
//                 placeholderTextColor="rgba(255,255,255,0.4)"
//                 autoCapitalize="none"
//                 autoCorrect={false}
//                 style={styles.input}
//               />
//               <TouchableOpacity
//                 onPress={() => {
//                   setAddError(null);
//                   try {
//                     addSource(newName, newUrl);
//                     setNewName('');
//                     setNewUrl('');
//                   } catch (e: any) {
//                     setAddError(e?.message ?? 'Could not add feed');
//                   }
//                 }}
//                 style={styles.addBtn}>
//                 <Text style={styles.addBtnText}>Add Feed</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={resetToDefaults}
//                 style={styles.resetBtn}>
//                 <Text style={styles.resetText}>Reset to Defaults</Text>
//               </TouchableOpacity>
//             </View>
//           </ScrollView>
//         </View>
//       </Modal>

//       {/* Brands modal */}
//       <Modal
//         visible={manageBrandsOpen}
//         animationType="slide"
//         onRequestClose={() => setManageBrandsOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Brands</Text>
//             <TouchableOpacity onPress={() => setManageBrandsOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </TouchableOpacity>
//           </View>
//           <View style={{padding: 12}}>
//             <TextInput
//               value={brandSearch}
//               onChangeText={setBrandSearch}
//               placeholder="Search your wardrobe brands…"
//               placeholderTextColor="rgba(255,255,255,0.4)"
//               style={styles.input}
//             />
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {wardrobeBrands.length === 0 ? (
//               <View style={{paddingHorizontal: 12, paddingTop: 8}}>
//                 <Text style={{color: 'rgba(255,255,255,0.7)'}}>
//                   No brands found yet. Add items to your wardrobe (with a brand)
//                   and they’ll show up here as chips you can toggle.
//                 </Text>
//               </View>
//             ) : (
//               Array.from(
//                 new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//               )
//                 .filter(
//                   b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//                 )
//                 .map(brand => {
//                   const show = chipAllowlist[brand] !== false;
//                   return (
//                     <View key={brand} style={styles.sourceRow}>
//                       <View style={{flex: 1}}>
//                         <Text style={styles.sourceName}>{brand}</Text>
//                       </View>
//                       <Text style={{color: '#fff', marginRight: 8}}>
//                         Visible
//                       </Text>
//                       <Switch
//                         value={show}
//                         onValueChange={v =>
//                           setChipAllowlist(prev => ({...prev, [brand]: v}))
//                         }
//                         trackColor={{
//                           false: 'rgba(255,255,255,0.18)',
//                           true: '#0A84FF',
//                         }}
//                         thumbColor="#fff"
//                       />
//                     </View>
//                   );
//                 })
//             )}
//           </ScrollView>
//         </View>
//       </Modal>

//       <Modal
//         visible={menuOpen}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setMenuOpen(false)}>
//         <TouchableOpacity
//           style={styles.menuBackdrop}
//           activeOpacity={1}
//           onPress={() => setMenuOpen(false)}>
//           <View style={styles.menuSheet}>
//             <Text style={styles.menuTitle}>Manage</Text>

//             <TouchableOpacity
//               style={styles.menuItem}
//               onPress={() => {
//                 setMenuOpen(false);
//                 setNotifOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Notifications</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.menuItem}
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageBrandsOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Brands</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.menuItem}
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Feeds</Text>
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       </Modal>

//       {/* Notifications prefs modal */}
//       <Modal
//         visible={notifOpen}
//         animationType="slide"
//         onRequestClose={() => setNotifOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Notifications</Text>
//             <TouchableOpacity onPress={() => setNotifOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </TouchableOpacity>
//           </View>

//           <ScrollView contentContainerStyle={{padding: 16, gap: 14}}>
//             <RowToggle
//               label="Enable Push"
//               value={pushEnabled}
//               onChange={async v => {
//                 setPushEnabled(v);
//                 await AsyncStorage.setItem(
//                   'notificationsEnabled',
//                   v ? 'true' : 'false',
//                 );
//                 savePrefs({push_enabled: v});
//                 // init handled by effect after prefsLoaded
//               }}
//             />
//             <RowToggle
//               label="Realtime for Following"
//               value={followingRealtime}
//               onChange={v => {
//                 setFollowingRealtime(v);
//                 savePrefs({following_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Realtime for Brands (For You)"
//               value={brandsRealtime}
//               onChange={v => {
//                 setBrandsRealtime(v);
//                 savePrefs({brands_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Breaking Fashion News"
//               value={breakingRealtime}
//               onChange={v => {
//                 setBreakingRealtime(v);
//                 savePrefs({breaking_realtime: v});
//               }}
//             />

//             <View style={{gap: 6}}>
//               <Text style={{color: '#fff', fontWeight: '700'}}>
//                 Daily Digest Hour (0–23)
//               </Text>
//               <TextInput
//                 value={String(digestHour)}
//                 onChangeText={txt => {
//                   const n = Math.max(0, Math.min(23, Number(txt) || 0));
//                   setDigestHour(n);
//                 }}
//                 onEndEditing={() => savePrefs({digest_hour: digestHour})}
//                 keyboardType="number-pad"
//                 placeholder="8"
//                 placeholderTextColor="rgba(255,255,255,0.4)"
//                 style={styles.input}
//               />
//             </View>
//           </ScrollView>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// function RowToggle({
//   label,
//   value,
//   onChange,
// }: {
//   label: string;
//   value: boolean;
//   onChange: (v: boolean) => void;
// }) {
//   return (
//     <View style={styles.rowToggle}>
//       <Text style={styles.rowToggleLabel}>{label}</Text>
//       <Switch
//         value={value}
//         onValueChange={onChange}
//         trackColor={{false: 'rgba(255,255,255,0.18)', true: '#0A84FF'}}
//         thumbColor="#fff"
//       />
//     </View>
//   );
// }

// function Segmented({tab, onChange}: {tab: Tab; onChange: (t: Tab) => void}) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const seg = StyleSheet.create({
//     root: {
//       height: 36,
//       backgroundColor: 'rgba(73, 73, 73, 1)',
//       borderRadius: 10,
//       padding: 3,
//       flexDirection: 'row',
//       flex: 1,
//       maxWidth: 280,
//     },
//     itemWrap: {
//       flex: 1,
//       borderRadius: 8,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     itemActive: {backgroundColor: theme.colors.background},
//     itemText: {color: theme.colors.foreground3, fontWeight: '700'},
//     itemTextActive: {color: theme.colors.foreground},
//   });

//   return (
//     <View style={seg.root}>
//       {(['For You', 'Following'] as Tab[]).map(t => {
//         const active = t === tab;
//         return (
//           <View key={t} style={[seg.itemWrap, active && seg.itemActive]}>
//             <Text
//               onPress={() => onChange(t)}
//               style={[seg.itemText, active && seg.itemTextActive]}>
//               {t}
//             </Text>
//           </View>
//         );
//       })}
//     </View>
//   );
// }

////////////////////

// import React, {useEffect, useMemo, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   RefreshControl,
//   Modal,
//   TextInput,
//   TouchableOpacity,
//   Switch,
//   Alert,
//   Platform,
// } from 'react-native';
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// dayjs.extend(relativeTime);

// import FeaturedHero from '../components/FashionFeed/FeaturedHero';
// import ArticleCard from '../components/FashionFeed/ArticleCard';
// import TrendChips from '../components/FashionFeed/TrendChips';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {useFashionFeeds} from '../hooks/useFashionFeeds';
// import {useFeedSources, FeedSource} from '../hooks/useFeedSources';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {initializeNotifications} from '../utils/notificationService';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {useAppTheme} from '../context/ThemeContext';
// import messaging from '@react-native-firebase/messaging';
// import PushNotification from 'react-native-push-notification';
// import {addNotification} from '../storage/notifications';

// type Tab = 'For You' | 'Following';

// type Chip = {
//   id: string;
//   label: string;
//   type: 'personal' | 'trending' | 'context' | 'source';
//   filter: {topics?: string[]; sources?: string[]; constraints?: any};
// };

// export default function ExploreScreen() {
//   const userId = useUUID() ?? '';

//   const {
//     sources,
//     enabled,
//     loading: sourcesLoading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//   } = useFeedSources({userId});

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   // ───────── Tabs control which feeds we pull ─────────
//   const [tab, setTab] = useState<Tab>('For You');
//   const feedsForTab = tab === 'Following' ? enabled : sources;

//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);
//   const [menuOpen, setMenuOpen] = useState(false);

//   const {articles, loading, refresh} = useFashionFeeds(
//     feedsForTab.map(fs => ({name: fs.name, url: fs.url})),
//     {userId},
//   );

//   // ───────── Notifications: follows + preferences ─────────
//   const [notifOpen, setNotifOpen] = useState(false);
//   const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
//   const [pushEnabled, setPushEnabled] = useState(true);
//   const [followingRealtime, setFollowingRealtime] = useState(false);
//   const [brandsRealtime, setBrandsRealtime] = useState(false);
//   const [breakingRealtime, setBreakingRealtime] = useState(true);
//   const [digestHour, setDigestHour] = useState<number>(8);
//   const [prefsLoaded, setPrefsLoaded] = useState(false); // gate init

//   // === OPEN FROM NOTIFICATION -> open Reader ===
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const openFromNotification = (data: any) => {
//     if (!data) return;
//     if (data.type === 'article' && data.url) {
//       setTab('For You');
//       setOpenUrl(data.url);
//       setOpenTitle(data.title || data.source || '');
//     }
//     if (data.type === 'test') {
//       setTab('For You');
//     }
//   };

//   const sendLocalTestNotification = async () => {
//     const title = 'Inbox test';
//     const message = 'This should appear in Notifications.';
//     const deeplink = 'myapp://news/123'; // optional

//     // save to your in-app inbox (what the Notifications screen reads)
//     await addNotification(userId, {
//       title,
//       message,
//       deeplink,
//       category: 'news',
//       data: {type: 'test'},
//     });

//     // (optional) show an OS banner so you also see a toast
//     try {
//       PushNotification.localNotification({
//         channelId: 'style-channel',
//         title,
//         message,
//         playSound: true,
//         soundName: 'default',
//       });
//     } catch {}
//   };

//   // Listeners to handle push taps / foreground messages
//   useEffect(() => {
//     // App in background → user taps the push
//     const unsubOpened = messaging().onNotificationOpenedApp(msg => {
//       if (msg?.data) openFromNotification(msg.data);
//     });

//     // App was quit → opened from a push
//     messaging()
//       .getInitialNotification()
//       .then(msg => {
//         if (msg?.data) openFromNotification(msg.data);
//       });

//     // App in foreground → play chime via local notification (+ optional prompt)
//     const unsubForeground = messaging().onMessage(async msg => {
//       const d = msg?.data || {};

//       // Make a local notification so iOS/Android will play a sound in-foreground
//       try {
//         PushNotification.localNotification({
//           channelId: 'style-channel', // must match created channel
//           title: msg.notification?.title ?? d.source ?? 'Fashion Feed',
//           message: msg.notification?.body ?? d.title ?? 'New article',
//           playSound: true,
//           soundName: 'default',
//           userInfo: d, // if you later handle taps via PushNotification.configure
//         });
//       } catch (e) {
//         console.log('⚠️ localNotification error', e);
//       }

//       // Optional: keep the in-app prompt so users can open immediately
//       if (d?.type === 'article' && d?.url) {
//         Alert.alert(
//           msg.notification?.title ?? 'Fashion Feed',
//           msg.notification?.body ?? 'New article',
//           [
//             {text: 'Later', style: 'cancel'},
//             {text: 'Read now', onPress: () => openFromNotification(d)},
//           ],
//         );
//       }
//     });

//     return () => {
//       unsubOpened();
//       unsubForeground();
//     };
//   }, []);

//   // Register once, only after prefs loaded and push is ON
//   useEffect(() => {
//     (async () => {
//       if (!userId || !prefsLoaded) return;
//       await AsyncStorage.setItem(
//         'notificationsEnabled',
//         pushEnabled ? 'true' : 'false',
//       );
//       if (pushEnabled) {
//         await initializeNotifications(userId); // requests perms, gets token, registers
//         console.log('✅ Push initialized & token registration attempted');
//       } else {
//         console.log('🔕 Push disabled locally');
//       }
//     })();
//   }, [userId, prefsLoaded, pushEnabled]);

//   // Load follows
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/follows?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         );
//         const json = await res.json();
//         const list: string[] = Array.isArray(json?.sources) ? json.sources : [];
//         setFollowingSet(new Set(list.map(s => s.toLowerCase())));
//       } catch (e) {
//         console.log('⚠️ load follows failed', e);
//       }
//     })();
//   }, [userId]);

//   // Load preferences (and mirror the local flag so initialize can run)
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/notifications/preferences/get?user_id=${encodeURIComponent(
//             userId,
//           )}`,
//         ).catch(() => null);

//         const json =
//           (await res?.json().catch(() => null)) ??
//           (await (
//             await fetch(`${API_BASE_URL}/notifications/preferences`, {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify({user_id: userId}),
//             })
//           ).json());

//         if (json) {
//           const pe = json.push_enabled ?? true;
//           setPushEnabled(pe);
//           setFollowingRealtime(json.following_realtime ?? false);
//           setBrandsRealtime(json.brands_realtime ?? false);
//           setBreakingRealtime(json.breaking_realtime ?? true);
//           setDigestHour(Number(json.digest_hour ?? 8));

//           await AsyncStorage.setItem(
//             'notificationsEnabled',
//             pe ? 'true' : 'false',
//           );
//         }
//       } catch (e) {
//         console.log('⚠️ load prefs failed', e);
//       } finally {
//         setPrefsLoaded(true); // allow init effect to run
//       }
//     })();
//   }, [userId]);

//   const savePrefs = async (
//     overrides?: Partial<{
//       push_enabled: boolean;
//       following_realtime: boolean;
//       brands_realtime: boolean;
//       breaking_realtime: boolean;
//       digest_hour: number;
//     }>,
//   ) => {
//     try {
//       const payload = {
//         user_id: userId,
//         push_enabled: pushEnabled,
//         following_realtime: followingRealtime,
//         brands_realtime: brandsRealtime,
//         breaking_realtime: breakingRealtime,
//         digest_hour: digestHour,
//         ...(overrides ?? {}),
//       };
//       await fetch(`${API_BASE_URL}/notifications/preferences`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });
//     } catch (e) {
//       console.log('⚠️ save prefs failed', e);
//     }
//   };

//   const followSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => new Set([...prev, key])); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/follow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => {
//         const copy = new Set(prev);
//         copy.delete(key);
//         return copy;
//       });
//     }
//   };

//   const unfollowSource = async (name: string) => {
//     const key = name.toLowerCase();
//     setFollowingSet(prev => {
//       const copy = new Set(prev);
//       copy.delete(key);
//       return copy;
//     }); // optimistic
//     try {
//       await fetch(`${API_BASE_URL}/notifications/unfollow`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, source: name}),
//       });
//     } catch (e) {
//       // revert on error
//       setFollowingSet(prev => new Set([...prev, key]));
//     }
//   };

//   // ───────── Personal chips ─────────
//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/wardrobe/brands/${userId}`);
//         const json = await res.json();
//         setWardrobeBrands(Array.isArray(json?.brands) ? json.brands : []);
//       } catch {
//         setWardrobeBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ───────── Trending chips ─────────
//   const trendingKeywords = useMemo(() => {
//     if (!articles?.length) return [];
//     const wordCounts: Record<string, number> = {};
//     for (const a of articles) {
//       const text = `${a.title ?? ''} ${a.summary ?? ''}`.toLowerCase();
//       text.split(/\W+/).forEach(w => {
//         if (w.length > 3) wordCounts[w] = (wordCounts[w] ?? 0) + 1;
//       });
//     }
//     return Object.entries(wordCounts)
//       .sort((a, b) => b[1] - a[1])
//       .map(([w]) => w)
//       .slice(0, 10);
//   }, [articles]);

//   // ───────── Context chips ─────────
//   const [weather, setWeather] = useState('hot');
//   useEffect(() => {
//     setWeather('hot'); // placeholder; swap with real weather call
//   }, []);

//   // ───────── Combine chips ─────────
//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [chips, setChips] = useState<Chip[]>([]);
//   useEffect(() => {
//     const personal = wardrobeBrands
//       .filter(b => chipAllowlist[b] !== false)
//       .slice(0, 6)
//       .map(b => ({
//         id: 'brand-' + b.toLowerCase(),
//         label: b,
//         type: 'personal' as const,
//         filter: {topics: [b.toLowerCase()]},
//       }));

//     const trending = trendingKeywords.map(t => ({
//       id: 'trend-' + t.toLowerCase(),
//       label: t,
//       type: 'trending' as const,
//       filter: {topics: [t]},
//     }));

//     const context = [
//       {
//         id: 'ctx-weather',
//         label: `Weather: ${weather}`,
//         type: 'context' as const,
//         filter: {constraints: {weather}},
//       },
//     ];

//     const sourceChips: Chip[] = enabled.map(es => ({
//       id: 'src-' + es.name.toLowerCase(),
//       label: es.name,
//       type: 'source',
//       filter: {sources: [es.name]},
//     }));

//     setChips([...sourceChips, ...personal, ...trending, ...context]);
//   }, [wardrobeBrands, trendingKeywords, weather, enabled, chipAllowlist]);

//   const [brandSearch, setBrandSearch] = useState('');

//   // active chip selection
//   const [activeChipLabel, setActiveChipLabel] = useState<string | null>(null);
//   const activeFilter =
//     chips.find(
//       c => c.label.toLowerCase() === (activeChipLabel ?? '').toLowerCase(),
//     )?.filter ?? null;

//   // ───────── HERO + LIST BY TAB ─────────
//   const articlesChrono = useMemo(
//     () =>
//       [...articles].sort(
//         (a, b) =>
//           (dayjs(b.publishedAt).valueOf() || 0) -
//           (dayjs(a.publishedAt).valueOf() || 0),
//       ),
//     [articles],
//   );

//   const hero = tab === 'Following' ? articlesChrono[0] : articles[0];

//   const restBase = useMemo(() => {
//     if (tab === 'Following') {
//       return articlesChrono.slice(1);
//     }
//     return articles.length > 1 ? articles.slice(1) : [];
//   }, [tab, articles, articlesChrono]);

//   const filteredForYou = useMemo(() => {
//     if (!activeFilter) return restBase;

//     const hasTopics = !!activeFilter.topics?.length;
//     const hasSources = !!activeFilter.sources?.length;

//     return restBase.filter(a => {
//       const sourceOk = !hasSources
//         ? true
//         : activeFilter.sources!.some(
//             src => src.toLowerCase() === a.source.toLowerCase(),
//           );

//       const topicOk = !hasTopics
//         ? true
//         : [a.title, a.source, a.summary].some(x =>
//             activeFilter.topics!.some(t =>
//               (x || '').toLowerCase().includes(t.toLowerCase()),
//             ),
//           );

//       return sourceOk && topicOk;
//     });
//   }, [restBase, activeFilter]);

//   const list = tab === 'For You' ? filteredForYou : restBase;

//   const [manageOpen, setManageOpen] = useState(false);
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

//   // === Send a REAL article push for testing (kept for dev) ===
//   const sendTestPush = async () => {
//     try {
//       const candidate = hero || list?.[0];
//       const data = {
//         type: 'article',
//         article_id: String(candidate?.id ?? Date.now()),
//         url: candidate?.link ?? 'https://www.vogue.com/',
//         title: candidate?.title ?? 'Fashion test article',
//         source: candidate?.source ?? 'Fashion Feed',
//       };

//       const res = await fetch(`${API_BASE_URL}/notifications/test`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           title: data.source,
//           body: data.title,
//           data,
//         }),
//       });
//       const json = await res.json();
//       Alert.alert(
//         'Push sent',
//         `Devices notified: ${json.sent ?? json.notifications_sent ?? 0}`,
//       );
//     } catch (e) {
//       Alert.alert('Push failed', String(e));
//     }
//   };

//   return (
//     <View>
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl
//             refreshing={loading || sourcesLoading}
//             onRefresh={refresh}
//             tintColor="#fff"
//           />
//         }
//         contentContainerStyle={{paddingBottom: 32}}>
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}>Fashion News</Text>
//         </View>

//         <View style={styles.topBar}>
//           <Segmented tab={tab} onChange={setTab} />
//           <TouchableOpacity
//             onPress={() => setMenuOpen(true)}
//             style={styles.iconBtn}
//             accessibilityLabel="Manage">
//             <Text style={styles.iconBtnText}>⋯</Text>
//           </TouchableOpacity>
//         </View>

//         {hero && (
//           <FeaturedHero
//             title={hero.title}
//             source={hero.source}
//             image={hero.image}
//             onPress={() => {
//               setOpenUrl(hero.link);
//               setOpenTitle(hero.title);
//             }}
//           />
//         )}

//         {tab === 'For You' && (
//           <TrendChips
//             items={chips.map(c => c.label)}
//             selected={activeChipLabel}
//             onTap={label =>
//               setActiveChipLabel(prev =>
//                 prev?.toLowerCase() === label.toLowerCase() ? null : label,
//               )
//             }
//             onMore={() => setManageBrandsOpen(true)}
//           />
//         )}

//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>
//             {tab === 'For You' ? 'Recommended for you' : 'Following'}
//           </Text>
//         </View>

//         <View style={[{paddingHorizontal: 16}]}>
//           {list.map(item => (
//             <ArticleCard
//               key={item.id}
//               title={item.title}
//               source={item.source}
//               image={item.image}
//               time={
//                 item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//               }
//               onPress={() => {
//                 setOpenUrl(item.link);
//                 setOpenTitle(item.title);
//               }}
//             />
//           ))}
//         </View>

//         {tab === 'For You' && wardrobeBrands.length === 0 && (
//           <View style={{paddingHorizontal: 16, paddingTop: 8}}>
//             <Text style={{color: 'rgba(255,255,255,0.6)', fontSize: 12}}>
//               No wardrobe brands detected yet. Add items to your wardrobe to
//               unlock personalized brand chips.
//             </Text>
//           </View>
//         )}
//       </ScrollView>

//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* Feeds modal */}
//       <Modal
//         visible={manageOpen}
//         animationType="slide"
//         onRequestClose={() => setManageOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Feeds</Text>
//             <TouchableOpacity onPress={() => setManageOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </TouchableOpacity>
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {sources.map((src: FeedSource) => {
//               const notifyOn = followingSet.has(src.name.toLowerCase());
//               return (
//                 <View key={src.id} style={styles.sourceRow}>
//                   <View style={{flex: 1}}>
//                     <TextInput
//                       defaultValue={src.name}
//                       placeholder="Name"
//                       placeholderTextColor="rgba(255,255,255,0.4)"
//                       onEndEditing={e =>
//                         renameSource(src.id, e.nativeEvent.text)
//                       }
//                       style={styles.sourceName}
//                     />
//                     <Text style={styles.sourceUrl} numberOfLines={1}>
//                       {src.url}
//                     </Text>
//                   </View>

//                   {/* Read toggle (in-app feed) */}
//                   <View style={{alignItems: 'center', marginRight: 10}}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Read
//                     </Text>
//                     <Switch
//                       value={!!src.enabled}
//                       onValueChange={v => toggleSource(src.id, v)}
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   {/* Notify toggle (push) */}
//                   <View style={{alignItems: 'center', marginRight: 10}}>
//                     <Text
//                       style={{
//                         color: '#fff',
//                         fontSize: 11,
//                         marginBottom: 2,
//                       }}>
//                       Notify
//                     </Text>
//                     <Switch
//                       value={notifyOn}
//                       onValueChange={v =>
//                         v ? followSource(src.name) : unfollowSource(src.name)
//                       }
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>

//                   <TouchableOpacity
//                     onPress={() => removeSource(src.id)}
//                     style={styles.removeBtn}>
//                     <Text style={styles.removeText}>Remove</Text>
//                   </TouchableOpacity>
//                 </View>
//               );
//             })}

//             <View style={styles.addBox}>
//               <Text style={styles.addTitle}>Add Feed</Text>
//               {!!addError && <Text style={styles.addError}>{addError}</Text>}
//               <TextInput
//                 value={newName}
//                 onChangeText={setNewName}
//                 placeholder="Display name (optional)"
//                 placeholderTextColor="rgba(255,255,255,0.4)"
//                 style={styles.input}
//               />
//               <TextInput
//                 value={newUrl}
//                 onChangeText={setNewUrl}
//                 placeholder="Feed URL (https://…)"
//                 placeholderTextColor="rgba(255,255,255,0.4)"
//                 autoCapitalize="none"
//                 autoCorrect={false}
//                 style={styles.input}
//               />
//               <TouchableOpacity
//                 onPress={() => {
//                   setAddError(null);
//                   try {
//                     addSource(newName, newUrl);
//                     setNewName('');
//                     setNewUrl('');
//                   } catch (e: any) {
//                     setAddError(e?.message ?? 'Could not add feed');
//                   }
//                 }}
//                 style={styles.addBtn}>
//                 <Text style={styles.addBtnText}>Add Feed</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={resetToDefaults}
//                 style={styles.resetBtn}>
//                 <Text style={styles.resetText}>Reset to Defaults</Text>
//               </TouchableOpacity>
//             </View>
//           </ScrollView>
//         </View>
//       </Modal>

//       {/* Brands modal */}
//       <Modal
//         visible={manageBrandsOpen}
//         animationType="slide"
//         onRequestClose={() => setManageBrandsOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Brands</Text>
//             <TouchableOpacity onPress={() => setManageBrandsOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </TouchableOpacity>
//           </View>
//           <View style={{padding: 12}}>
//             <TextInput
//               value={brandSearch}
//               onChangeText={setBrandSearch}
//               placeholder="Search your wardrobe brands…"
//               placeholderTextColor="rgba(255,255,255,0.4)"
//               style={styles.input}
//             />
//           </View>
//           <ScrollView contentContainerStyle={{paddingBottom: 32}}>
//             {wardrobeBrands.length === 0 ? (
//               <View style={{paddingHorizontal: 12, paddingTop: 8}}>
//                 <Text style={{color: 'rgba(255,255,255,0.7)'}}>
//                   No brands found yet. Add items to your wardrobe (with a brand)
//                   and they’ll show up here as chips you can toggle.
//                 </Text>
//               </View>
//             ) : (
//               Array.from(
//                 new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//               )
//                 .filter(
//                   b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//                 )
//                 .map(brand => {
//                   const show = chipAllowlist[brand] !== false;
//                   return (
//                     <View key={brand} style={styles.sourceRow}>
//                       <View style={{flex: 1}}>
//                         <Text style={styles.sourceName}>{brand}</Text>
//                       </View>
//                       <Text style={{color: '#fff', marginRight: 8}}>
//                         Visible
//                       </Text>
//                       <Switch
//                         value={show}
//                         onValueChange={v =>
//                           setChipAllowlist(prev => ({...prev, [brand]: v}))
//                         }
//                         trackColor={{
//                           false: 'rgba(255,255,255,0.18)',
//                           true: '#0A84FF',
//                         }}
//                         thumbColor="#fff"
//                       />
//                     </View>
//                   );
//                 })
//             )}
//           </ScrollView>
//         </View>
//       </Modal>

//       <Modal
//         visible={menuOpen}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setMenuOpen(false)}>
//         <TouchableOpacity
//           style={styles.menuBackdrop}
//           activeOpacity={1}
//           onPress={() => setMenuOpen(false)}>
//           <View style={styles.menuSheet}>
//             <Text style={styles.menuTitle}>Manage</Text>

//             <TouchableOpacity
//               style={styles.menuItem}
//               onPress={() => {
//                 setMenuOpen(false);
//                 setNotifOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Notifications</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.menuItem}
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageBrandsOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Brands</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.menuItem}
//               onPress={() => {
//                 setMenuOpen(false);
//                 setManageOpen(true);
//               }}>
//               <Text style={styles.menuItemText}>Feeds</Text>
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       </Modal>

//       {/* Notifications prefs modal */}
//       <Modal
//         visible={notifOpen}
//         animationType="slide"
//         onRequestClose={() => setNotifOpen(false)}>
//         <View style={styles.modalRoot}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Notifications</Text>
//             <TouchableOpacity onPress={() => setNotifOpen(false)}>
//               <Text style={styles.done}>Done</Text>
//             </TouchableOpacity>
//           </View>

//           <ScrollView contentContainerStyle={{padding: 16, gap: 14}}>
//             <RowToggle
//               label="Enable Push"
//               value={pushEnabled}
//               onChange={async v => {
//                 setPushEnabled(v);
//                 await AsyncStorage.setItem(
//                   'notificationsEnabled',
//                   v ? 'true' : 'false',
//                 );
//                 savePrefs({push_enabled: v});
//                 // init handled by effect after prefsLoaded
//               }}
//             />
//             <RowToggle
//               label="Realtime for Following"
//               value={followingRealtime}
//               onChange={v => {
//                 setFollowingRealtime(v);
//                 savePrefs({following_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Realtime for Brands (For You)"
//               value={brandsRealtime}
//               onChange={v => {
//                 setBrandsRealtime(v);
//                 savePrefs({brands_realtime: v});
//               }}
//             />
//             <RowToggle
//               label="Breaking Fashion News"
//               value={breakingRealtime}
//               onChange={v => {
//                 setBreakingRealtime(v);
//                 savePrefs({breaking_realtime: v});
//               }}
//             />

//             <View style={{gap: 6}}>
//               <Text style={{color: '#fff', fontWeight: '700'}}>
//                 Daily Digest Hour (0–23)
//               </Text>
//               <TextInput
//                 value={String(digestHour)}
//                 onChangeText={txt => {
//                   const n = Math.max(0, Math.min(23, Number(txt) || 0));
//                   setDigestHour(n);
//                 }}
//                 onEndEditing={() => savePrefs({digest_hour: digestHour})}
//                 keyboardType="number-pad"
//                 placeholder="8"
//                 placeholderTextColor="rgba(255,255,255,0.4)"
//                 style={styles.input}
//               />
//             </View>

//             {/* <TouchableOpacity onPress={sendTestPush} style={styles.addBtn}>
//               <Text style={styles.addBtnText}>Send Test Push</Text>
//             </TouchableOpacity> */}

//             {/* <TouchableOpacity
//               onPress={sendLocalTestNotification}
//               style={styles.addBtn}>
//               <Text style={styles.addBtnText}>Send Test Push</Text>
//             </TouchableOpacity> */}
//           </ScrollView>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// function RowToggle({
//   label,
//   value,
//   onChange,
// }: {
//   label: string;
//   value: boolean;
//   onChange: (v: boolean) => void;
// }) {
//   return (
//     <View style={styles.rowToggle}>
//       <Text style={styles.rowToggleLabel}>{label}</Text>
//       <Switch
//         value={value}
//         onValueChange={onChange}
//         trackColor={{false: 'rgba(255,255,255,0.18)', true: '#0A84FF'}}
//         thumbColor="#fff"
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, backgroundColor: '#000'},
//   sourceUrl: {color: 'rgba(255,255,255,0.6)', fontSize: 12, maxWidth: 240},
//   removeBtn: {
//     marginLeft: 6,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 8,
//     backgroundColor: 'rgba(255,255,255,0.06)',
//   },
//   removeText: {
//     color: 'rgba(255, 255, 255, 1)',
//     fontWeight: '700',
//     fontSize: 12,
//   },
//   addBox: {padding: 16, gap: 8},
//   addTitle: {color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 4},
//   addError: {color: '#FF453A', fontSize: 12, marginBottom: 2},
//   addBtn: {
//     marginTop: 8,
//     backgroundColor: '#6f00ffff',
//     borderRadius: 10,
//     paddingVertical: 10,
//     alignItems: 'center',
//   },
//   addBtnText: {color: '#fff', fontWeight: '800'},
//   resetBtn: {
//     marginTop: 8,
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     borderRadius: 10,
//     paddingVertical: 10,
//     alignItems: 'center',
//   },
//   resetText: {color: 'rgba(255,255,255,0.9)', fontWeight: '700'},
//   topBar: {
//     paddingTop: 8,
//     paddingHorizontal: 16,
//     paddingBottom: 6,
//     backgroundColor: '#000',
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   iconBtn: {
//     marginLeft: 8,
//     width: 36,
//     height: 36,
//     borderRadius: 10,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'rgba(89, 0, 255, 1)',
//   },
//   iconBtnText: {
//     color: '#fff',
//     fontWeight: '900',
//     fontSize: 20,
//     lineHeight: 20,
//     marginTop: -2,
//   },

//   menuBackdrop: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.4)',
//     justifyContent: 'flex-start',
//     alignItems: 'flex-end',
//   },
//   menuSheet: {
//     marginTop: 60,
//     marginRight: 12,
//     width: 200,
//     backgroundColor: '#111',
//     borderRadius: 12,
//     paddingVertical: 8,
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: 'rgba(255,255,255,0.12)',
//     shadowColor: '#000',
//     shadowOpacity: 0.35,
//     shadowRadius: 10,
//     shadowOffset: {width: 0, height: 8},
//     elevation: 8,
//   },
//   menuTitle: {
//     color: 'rgba(255,255,255,0.7)',
//     fontSize: 12,
//     fontWeight: '700',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//   },
//   menuItem: {
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//   },
//   menuItemText: {
//     color: '#fff',
//     fontWeight: '700',
//   },
//   manageBtn: {
//     marginLeft: 'auto',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 8,
//     backgroundColor: 'rgba(89, 0, 255, 1)',
//   },
//   manageText: {color: '#ffffffff', fontWeight: '700'},
//   sectionHeader: {
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     backgroundColor: '#000',
//   },
//   sectionTitle: {color: '#6600ffff', fontWeight: '800', fontSize: 20},
//   modalRoot: {flex: 1, backgroundColor: '#000', marginTop: 80},
//   modalHeader: {
//     height: 48,
//     borderBottomColor: 'rgba(255,255,255,0.1)',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     paddingHorizontal: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   modalTitle: {color: '#fff', fontWeight: '800', fontSize: 18},
//   done: {color: '#5900ffff', fontWeight: '700'},
//   sourceRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     borderBottomColor: 'rgba(255,255,255,0.06)',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//   },
//   sourceName: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '700',
//     padding: 0,
//     marginBottom: 2,
//   },
//   input: {
//     backgroundColor: 'rgba(255,255,255,0.06)',
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     color: '#fff',
//   },
//   rowToggle: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     backgroundColor: 'rgba(255,255,255,0.06)',
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//     borderRadius: 10,
//   },
//   rowToggleLabel: {color: '#fff', fontSize: 14, fontWeight: '700'},
// });

// function Segmented({tab, onChange}: {tab: Tab; onChange: (t: Tab) => void}) {
//   return (
//     <View style={seg.root}>
//       {(['For You', 'Following'] as Tab[]).map(t => {
//         const active = t === tab;
//         return (
//           <View key={t} style={[seg.itemWrap, active && seg.itemActive]}>
//             <Text
//               onPress={() => onChange(t)}
//               style={[seg.itemText, active && seg.itemTextActive]}>
//               {t}
//             </Text>
//           </View>
//         );
//       })}
//     </View>
//   );
// }

// const seg = StyleSheet.create({
//   root: {
//     height: 36,
//     backgroundColor: 'rgba(73, 73, 73, 1)',
//     borderRadius: 10,
//     padding: 3,
//     flexDirection: 'row',
//     flex: 1,
//     maxWidth: 280,
//   },
//   itemWrap: {
//     flex: 1,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   itemActive: {backgroundColor: '#111213'},
//   itemText: {color: 'rgba(255,255,255,0.75)', fontWeight: '700'},
//   itemTextActive: {color: '#fff'},
// });
