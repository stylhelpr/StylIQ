import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  TouchableOpacity,
  Switch,
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

type Tab = 'For You' | 'Following';

type Chip = {
  id: string;
  label: string;
  type: 'personal' | 'trending' | 'context' | 'source';
  filter: {topics?: string[]; sources?: string[]; constraints?: any};
};

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

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const {articles, loading, refresh} = useFashionFeeds(
    enabled.map(s => ({name: s.name, url: s.url})),
    {userId},
  );

  // ──────────────── PERSONAL CHIPS ────────────────
  const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/wardrobe/brands/${userId}`);
        const json = await res.json();
        setWardrobeBrands(Array.isArray(json?.brands) ? json.brands : []);
      } catch {
        setWardrobeBrands([]);
      }
    })();
  }, [userId]);

  // ──────────────── TRENDING CHIPS ────────────────
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

  // ──────────────── CONTEXT CHIPS ────────────────
  const [weather, setWeather] = useState('hot');
  useEffect(() => {
    // TODO: Replace with real weather API call
    setWeather('hot');
  }, []);

  // ──────────────── COMBINE CHIPS ────────────────
  const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
    {},
  );
  const [chips, setChips] = useState<Chip[]>([]);
  useEffect(() => {
    const personal = wardrobeBrands
      // default ON unless explicitly false in allowlist
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

    const sourceChips: Chip[] = enabled.map(s => ({
      id: 'src-' + s.name.toLowerCase(),
      label: s.name,
      type: 'source',
      filter: {sources: [s.name]},
    }));

    setChips([...sourceChips, ...personal, ...trending, ...context]);
  }, [wardrobeBrands, trendingKeywords, weather, enabled, chipAllowlist]);

  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const res = await fetch(`${API_BASE_URL}/wardrobe/brands/${userId}`);
  //       const json = await res.json();
  //       const list = Array.isArray(json?.brands) ? json.brands : [];
  //       // ✅ fallback if empty
  //       setWardrobeBrands(
  //         list.length > 0 ? list : ['Nike', 'Prada', 'Zara', 'Gucci'],
  //       );
  //     } catch {
  //       setWardrobeBrands(['Nike', 'Prada', 'Zara', 'Gucci']);
  //     }
  //   })();
  // }, [userId]);

  const [brandSearch, setBrandSearch] = useState('');

  // active chip selection (store the label so TrendChips can highlight it)
  const [activeChipLabel, setActiveChipLabel] = useState<string | null>(null);
  const activeFilter =
    chips.find(
      c => c.label.toLowerCase() === (activeChipLabel ?? '').toLowerCase(),
    )?.filter ?? null;

  const hero = articles[0];
  const rest = useMemo(
    () => (articles.length > 1 ? articles.slice(1) : []),
    [articles],
  );

  const filtered = useMemo(() => {
    if (!activeFilter) return rest;

    const hasTopics = !!activeFilter.topics?.length;
    const hasSources = !!activeFilter.sources?.length;

    // if source filter is present, respect it (acts as an AND with topics if both exist)
    return rest.filter(a => {
      const sourceOk = !hasSources
        ? true
        : activeFilter.sources!.some(
            s => s.toLowerCase() === a.source.toLowerCase(),
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
  }, [rest, activeFilter]);

  const [tab, setTab] = useState<Tab>('For You');
  const [openUrl, setOpenUrl] = useState<string | undefined>();
  const [openTitle, setOpenTitle] = useState<string | undefined>();
  const [manageOpen, setManageOpen] = useState(false);
  const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading || sourcesLoading}
            onRefresh={refresh}
            tintColor="#fff"
          />
        }
        contentContainerStyle={{paddingBottom: 32}}>
        <View style={styles.topBar}>
          <Segmented tab={tab} onChange={setTab} />
          <TouchableOpacity
            onPress={() => setManageBrandsOpen(true)}
            style={[styles.manageBtn, {marginRight: 8}]}>
            <Text style={styles.manageText}>Brands</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setManageOpen(true)}
            style={styles.manageBtn}>
            <Text style={styles.manageText}>Feeds</Text>
          </TouchableOpacity>
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

        <TrendChips
          items={chips.map(c => c.label)}
          selected={activeChipLabel}
          onTap={label =>
            setActiveChipLabel(prev =>
              prev?.toLowerCase() === label.toLowerCase() ? null : label,
            )
          }
          onMore={() => setManageBrandsOpen(true)}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fashion News</Text>
        </View>

        {filtered.map(item => (
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
      </ScrollView>

      <ReaderModal
        visible={!!openUrl}
        url={openUrl}
        title={openTitle}
        onClose={() => setOpenUrl(undefined)}
      />

      {/* existing Feeds modal */}
      <Modal
        visible={manageOpen}
        animationType="slide"
        onRequestClose={() => setManageOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Feeds</Text>
            <TouchableOpacity onPress={() => setManageOpen(false)}>
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{paddingBottom: 32}}>
            {sources.map((s: FeedSource) => (
              <View key={s.id} style={styles.sourceRow}>
                <View style={{flex: 1}}>
                  <TextInput
                    defaultValue={s.name}
                    placeholder="Name"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    onEndEditing={e => renameSource(s.id, e.nativeEvent.text)}
                    style={styles.sourceName}
                  />
                  <Text style={styles.sourceUrl} numberOfLines={1}>
                    {s.url}
                  </Text>
                </View>
                <Switch
                  value={!!s.enabled}
                  onValueChange={v => toggleSource(s.id, v)}
                  trackColor={{
                    false: 'rgba(255,255,255,0.18)',
                    true: '#0A84FF',
                  }}
                  thumbColor="#fff"
                />
                <TouchableOpacity
                  onPress={() => removeSource(s.id)}
                  style={styles.removeBtn}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addBox}>
              <Text style={styles.addTitle}>Add Feed</Text>
              {!!addError && <Text style={styles.addError}>{addError}</Text>}
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Display name (optional)"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.input}
              />
              <TextInput
                value={newUrl}
                onChangeText={setNewUrl}
                placeholder="Feed URL (https://…)"
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <TouchableOpacity
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
                style={styles.addBtn}>
                <Text style={styles.addBtnText}>Add Feed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={resetToDefaults}
                style={styles.resetBtn}>
                <Text style={styles.resetText}>Reset to Defaults</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* brands modal */}
      <Modal
        visible={manageBrandsOpen}
        animationType="slide"
        onRequestClose={() => setManageBrandsOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Brands</Text>
            <TouchableOpacity onPress={() => setManageBrandsOpen(false)}>
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={{padding: 12}}>
            <TextInput
              value={brandSearch}
              onChangeText={setBrandSearch}
              placeholder="Search your wardrobe brands…"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.input}
            />
          </View>
          <ScrollView contentContainerStyle={{paddingBottom: 32}}>
            {Array.from(
              new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
            )
              .filter(
                b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
              )
              .map(brand => {
                // default ON unless explicitly set to false
                const show = chipAllowlist[brand] !== false;
                return (
                  <View key={brand} style={styles.sourceRow}>
                    <View style={{flex: 1}}>
                      <Text style={styles.sourceName}>{brand}</Text>
                    </View>
                    <Text style={{color: '#fff', marginRight: 8}}>
                      Show as Chip
                    </Text>
                    <Switch
                      value={show}
                      onValueChange={v =>
                        setChipAllowlist(prev => ({...prev, [brand]: v}))
                      }
                      trackColor={{
                        false: 'rgba(255,255,255,0.18)',
                        true: '#0A84FF',
                      }}
                      thumbColor="#fff"
                    />
                  </View>
                );
              })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  sourceUrl: {color: 'rgba(255,255,255,0.6)', fontSize: 12, maxWidth: 240},
  removeBtn: {
    marginLeft: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  removeText: {
    color: 'rgba(255, 255, 255, 1)',
    fontWeight: '700',
    fontSize: 12,
  },
  addBox: {padding: 16, gap: 8},
  addTitle: {color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 4},
  addError: {color: '#FF453A', fontSize: 12, marginBottom: 2},
  addBtn: {
    marginTop: 8,
    backgroundColor: '#6f00ffff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addBtnText: {color: '#fff', fontWeight: '800'},
  resetBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resetText: {color: 'rgba(255,255,255,0.9)', fontWeight: '700'},
  topBar: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 6,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(89, 0, 255, 1)',
  },
  manageText: {color: '#ffffffff', fontWeight: '700'},
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#000',
  },
  sectionTitle: {color: '#6600ffff', fontWeight: '800', fontSize: 20},
  modalRoot: {flex: 1, backgroundColor: '#000', marginTop: 80},
  modalHeader: {
    height: 48,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {color: '#fff', fontWeight: '800', fontSize: 18},
  done: {color: '#5900ffff', fontWeight: '700'},
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
    marginBottom: 2,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
  },
});

function Segmented({tab, onChange}: {tab: Tab; onChange: (t: Tab) => void}) {
  return (
    <View style={seg.root}>
      {(['For You', 'Following'] as Tab[]).map(t => {
        const active = t === tab;
        return (
          <View key={t} style={[seg.itemWrap, active && seg.itemActive]}>
            <Text
              onPress={() => onChange(t)}
              style={[seg.itemText, active && seg.itemTextActive]}>
              {t}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const seg = StyleSheet.create({
  root: {
    height: 36,
    backgroundColor: 'rgba(73, 73, 73, 1)',
    borderRadius: 10,
    padding: 3,
    flexDirection: 'row',
    flex: 1,
    maxWidth: 240,
  },
  itemWrap: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {backgroundColor: '#111213'},
  itemText: {color: 'rgba(255,255,255,0.75)', fontWeight: '700'},
  itemTextActive: {color: '#fff'},
});

/////////////////////

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

//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);

//   const {articles, loading, refresh} = useFashionFeeds(
//     enabled.map(s => ({name: s.name, url: s.url})),
//     {userId},
//   );

//   // ──────────────── PERSONAL CHIPS ────────────────
//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
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

//   // ──────────────── TRENDING CHIPS ────────────────
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

//   // ──────────────── CONTEXT CHIPS ────────────────
//   const [weather, setWeather] = useState('hot');
//   useEffect(() => {
//     // TODO: Replace with real weather API call
//     setWeather('hot');
//   }, []);

//   // ──────────────── COMBINE CHIPS ────────────────
//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [chips, setChips] = useState<Chip[]>([]);
//   useEffect(() => {
//     const personal = wardrobeBrands
//       // default ON unless explicitly false in allowlist
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

//     const sourceChips: Chip[] = enabled.map(s => ({
//       id: 'src-' + s.name.toLowerCase(),
//       label: s.name,
//       type: 'source',
//       filter: {sources: [s.name]},
//     }));

//     setChips([...sourceChips, ...personal, ...trending, ...context]);
//   }, [wardrobeBrands, trendingKeywords, weather, enabled, chipAllowlist]);

//   const [brandSearch, setBrandSearch] = useState('');

//   // active chip selection (store the label so TrendChips can highlight it)
//   const [activeChipLabel, setActiveChipLabel] = useState<string | null>(null);
//   const activeFilter =
//     chips.find(
//       c => c.label.toLowerCase() === (activeChipLabel ?? '').toLowerCase(),
//     )?.filter ?? null;

//   const hero = articles[0];
//   const rest = useMemo(
//     () => (articles.length > 1 ? articles.slice(1) : []),
//     [articles],
//   );

//   const filtered = useMemo(() => {
//     if (!activeFilter) return rest;

//     const hasTopics = !!activeFilter.topics?.length;
//     const hasSources = !!activeFilter.sources?.length;

//     // if source filter is present, respect it (acts as an AND with topics if both exist)
//     return rest.filter(a => {
//       const sourceOk = !hasSources
//         ? true
//         : activeFilter.sources!.some(
//             s => s.toLowerCase() === a.source.toLowerCase(),
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
//   }, [rest, activeFilter]);

//   const [tab, setTab] = useState<Tab>('For You');
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const [manageOpen, setManageOpen] = useState(false);
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

//   return (
//     <View style={styles.container}>
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
//         <View style={styles.topBar}>
//           <Segmented tab={tab} onChange={setTab} />
//           <TouchableOpacity
//             onPress={() => setManageBrandsOpen(true)}
//             style={[styles.manageBtn, {marginRight: 8}]}>
//             <Text style={styles.manageText}>Brands</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={() => setManageOpen(true)}
//             style={styles.manageBtn}>
//             <Text style={styles.manageText}>Feeds</Text>
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

//         <TrendChips
//           items={chips.map(c => c.label)}
//           selected={activeChipLabel}
//           onTap={label =>
//             setActiveChipLabel(prev =>
//               prev?.toLowerCase() === label.toLowerCase() ? null : label,
//             )
//           }
//           onMore={() => setManageBrandsOpen(true)}
//         />

//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>Fashion News</Text>
//         </View>

//         {filtered.map(item => (
//           <ArticleCard
//             key={item.id}
//             title={item.title}
//             source={item.source}
//             image={item.image}
//             time={
//               item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//             }
//             onPress={() => {
//               setOpenUrl(item.link);
//               setOpenTitle(item.title);
//             }}
//           />
//         ))}
//       </ScrollView>

//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* existing Feeds modal */}
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
//             {sources.map((s: FeedSource) => (
//               <View key={s.id} style={styles.sourceRow}>
//                 <View style={{flex: 1}}>
//                   <TextInput
//                     defaultValue={s.name}
//                     placeholder="Name"
//                     placeholderTextColor="rgba(255,255,255,0.4)"
//                     onEndEditing={e => renameSource(s.id, e.nativeEvent.text)}
//                     style={styles.sourceName}
//                   />
//                   <Text style={styles.sourceUrl} numberOfLines={1}>
//                     {s.url}
//                   </Text>
//                 </View>
//                 <Switch
//                   value={!!s.enabled}
//                   onValueChange={v => toggleSource(s.id, v)}
//                   trackColor={{
//                     false: 'rgba(255,255,255,0.18)',
//                     true: '#0A84FF',
//                   }}
//                   thumbColor="#fff"
//                 />
//                 <TouchableOpacity
//                   onPress={() => removeSource(s.id)}
//                   style={styles.removeBtn}>
//                   <Text style={styles.removeText}>Remove</Text>
//                 </TouchableOpacity>
//               </View>
//             ))}
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

//       {/* brands modal */}
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
//             {Array.from(
//               new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//             )
//               .filter(
//                 b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//               )
//               .map(brand => {
//                 // default ON unless explicitly set to false
//                 const show = chipAllowlist[brand] !== false;
//                 return (
//                   <View key={brand} style={styles.sourceRow}>
//                     <View style={{flex: 1}}>
//                       <Text style={styles.sourceName}>{brand}</Text>
//                     </View>
//                     <Text style={{color: '#fff', marginRight: 8}}>
//                       Show as Chip
//                     </Text>
//                     <Switch
//                       value={show}
//                       onValueChange={v =>
//                         setChipAllowlist(prev => ({...prev, [brand]: v}))
//                       }
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>
//                 );
//               })}
//           </ScrollView>
//         </View>
//       </Modal>
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
//     maxWidth: 240,
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
//   TouchableOpacity,
//   Switch,
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

//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);

//   const {articles, loading, refresh} = useFashionFeeds(
//     enabled.map(s => ({name: s.name, url: s.url})),
//     {userId},
//   );

//   // ──────────────── PERSONAL CHIPS ────────────────
//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
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

//   // ──────────────── TRENDING CHIPS ────────────────
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

//   // ──────────────── CONTEXT CHIPS ────────────────
//   const [weather, setWeather] = useState('hot');
//   useEffect(() => {
//     // TODO: Replace with real weather API call
//     setWeather('hot');
//   }, []);

//   // ──────────────── COMBINE CHIPS ────────────────
//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [chips, setChips] = useState<Chip[]>([]);
//   useEffect(() => {
//     const personal = wardrobeBrands
//       // default ON unless explicitly false in allowlist
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

//     const sourceChips: Chip[] = enabled.map(s => ({
//       id: 'src-' + s.name.toLowerCase(),
//       label: s.name,
//       type: 'source',
//       filter: {sources: [s.name]},
//     }));

//     setChips([...sourceChips, ...personal, ...trending, ...context]);
//   }, [wardrobeBrands, trendingKeywords, weather, enabled, chipAllowlist]);

//   const [brandSearch, setBrandSearch] = useState('');

//   // active chip selection (store the label so TrendChips can highlight it)
//   const [activeChipLabel, setActiveChipLabel] = useState<string | null>(null);
//   const activeFilter =
//     chips.find(
//       c => c.label.toLowerCase() === (activeChipLabel ?? '').toLowerCase(),
//     )?.filter ?? null;

//   const hero = articles[0];
//   const rest = useMemo(
//     () => (articles.length > 1 ? articles.slice(1) : []),
//     [articles],
//   );

//   const filtered = useMemo(() => {
//     if (!activeFilter) return rest;

//     const hasTopics = !!activeFilter.topics?.length;
//     const hasSources = !!activeFilter.sources?.length;

//     // if source filter is present, respect it (acts as an AND with topics if both exist)
//     return rest.filter(a => {
//       const sourceOk = !hasSources
//         ? true
//         : activeFilter.sources!.some(
//             s => s.toLowerCase() === a.source.toLowerCase(),
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
//   }, [rest, activeFilter]);

//   const [tab, setTab] = useState<Tab>('For You');
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const [manageOpen, setManageOpen] = useState(false);
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

//   return (
//     <View style={styles.container}>
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
//         <View style={styles.topBar}>
//           <Segmented tab={tab} onChange={setTab} />
//           <TouchableOpacity
//             onPress={() => setManageBrandsOpen(true)}
//             style={[styles.manageBtn, {marginRight: 8}]}>
//             <Text style={styles.manageText}>Brands</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={() => setManageOpen(true)}
//             style={styles.manageBtn}>
//             <Text style={styles.manageText}>Feeds</Text>
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

//         <TrendChips
//           items={chips.map(c => c.label)}
//           selected={activeChipLabel}
//           onTap={label =>
//             setActiveChipLabel(prev =>
//               prev?.toLowerCase() === label.toLowerCase() ? null : label,
//             )
//           }
//           onMore={() => setManageBrandsOpen(true)}
//         />

//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>Fashion News</Text>
//         </View>

//         {filtered.map(item => (
//           <ArticleCard
//             key={item.id}
//             title={item.title}
//             source={item.source}
//             image={item.image}
//             time={
//               item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//             }
//             onPress={() => {
//               setOpenUrl(item.link);
//               setOpenTitle(item.title);
//             }}
//           />
//         ))}
//       </ScrollView>

//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* existing Feeds modal */}
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
//             {sources.map((s: FeedSource) => (
//               <View key={s.id} style={styles.sourceRow}>
//                 <View style={{flex: 1}}>
//                   <TextInput
//                     defaultValue={s.name}
//                     placeholder="Name"
//                     placeholderTextColor="rgba(255,255,255,0.4)"
//                     onEndEditing={e => renameSource(s.id, e.nativeEvent.text)}
//                     style={styles.sourceName}
//                   />
//                   <Text style={styles.sourceUrl} numberOfLines={1}>
//                     {s.url}
//                   </Text>
//                 </View>
//                 <Switch
//                   value={!!s.enabled}
//                   onValueChange={v => toggleSource(s.id, v)}
//                   trackColor={{
//                     false: 'rgba(255,255,255,0.18)',
//                     true: '#0A84FF',
//                   }}
//                   thumbColor="#fff"
//                 />
//                 <TouchableOpacity
//                   onPress={() => removeSource(s.id)}
//                   style={styles.removeBtn}>
//                   <Text style={styles.removeText}>Remove</Text>
//                 </TouchableOpacity>
//               </View>
//             ))}
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

//       {/* brands modal */}
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
//             {Array.from(
//               new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//             )
//               .filter(
//                 b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//               )
//               .map(brand => {
//                 // default ON unless explicitly set to false
//                 const show = chipAllowlist[brand] !== false;
//                 return (
//                   <View key={brand} style={styles.sourceRow}>
//                     <View style={{flex: 1}}>
//                       <Text style={styles.sourceName}>{brand}</Text>
//                     </View>
//                     <Text style={{color: '#fff', marginRight: 8}}>
//                       Show as Chip
//                     </Text>
//                     <Switch
//                       value={show}
//                       onValueChange={v =>
//                         setChipAllowlist(prev => ({...prev, [brand]: v}))
//                       }
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>
//                 );
//               })}
//           </ScrollView>
//         </View>
//       </Modal>
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
//     maxWidth: 240,
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

//////////////////////

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

// type Tab = 'For You' | 'Following';

// type Chip = {
//   id: string;
//   label: string;
//   type: 'personal' | 'trending' | 'context';
//   filter: {topics?: string[]; constraints?: any};
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

//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);

//   const {articles, loading, refresh} = useFashionFeeds(
//     enabled.map(s => ({name: s.name, url: s.url})),
//     {userId},
//   );

//   // ──────────────── PERSONAL CHIPS ────────────────
//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
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

//   // ──────────────── TRENDING CHIPS ────────────────
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

//   // ──────────────── CONTEXT CHIPS ────────────────
//   const [weather, setWeather] = useState('hot');
//   useEffect(() => {
//     // TODO: Replace with real weather API call
//     setWeather('hot');
//   }, []);

//   // ──────────────── COMBINE CHIPS ────────────────
//   const [chips, setChips] = useState<Chip[]>([]);
//   useEffect(() => {
//     const personal = wardrobeBrands.slice(0, 6).map(b => ({
//       id: 'brand-' + b.toLowerCase(),
//       label: b,
//       type: 'personal' as const,
//       filter: {topics: [b.toLowerCase()]},
//     }));

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

//     setChips([...personal, ...trending, ...context]);
//   }, [wardrobeBrands, trendingKeywords, weather]);

//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [brandSearch, setBrandSearch] = useState('');

//   const [activeFilter, setActiveFilter] = useState<{topics?: string[]} | null>(
//     null,
//   );

//   const hero = articles[0];
//   const rest = useMemo(
//     () => (articles.length > 1 ? articles.slice(1) : []),
//     [articles],
//   );

//   const filtered = useMemo(() => {
//     if (!activeFilter?.topics?.length) return rest;
//     const terms = activeFilter.topics.map(t => t.toLowerCase());
//     return rest.filter(a =>
//       [a.title, a.source, a.summary].some(x =>
//         terms.some(t => (x || '').toLowerCase().includes(t)),
//       ),
//     );
//   }, [rest, activeFilter]);

//   const [tab, setTab] = useState<Tab>('For You');
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const [manageOpen, setManageOpen] = useState(false);
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

//   return (
//     <View style={styles.container}>
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
//         <View style={styles.topBar}>
//           <Segmented tab={tab} onChange={setTab} />
//           <TouchableOpacity
//             onPress={() => setManageBrandsOpen(true)}
//             style={[styles.manageBtn, {marginRight: 8}]}>
//             <Text style={styles.manageText}>Brands</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={() => setManageOpen(true)}
//             style={styles.manageBtn}>
//             <Text style={styles.manageText}>Feeds</Text>
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

//         <TrendChips
//           items={chips.map(c => c.label)}
//           selected={activeFilter?.topics?.[0] ?? null}
//           onTap={term =>
//             setActiveFilter(prev =>
//               prev?.topics?.[0] === term ? null : {topics: [term]},
//             )
//           }
//           onMore={() => setManageBrandsOpen(true)}
//         />

//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>Fashion News</Text>
//         </View>

//         {filtered.map(item => (
//           <ArticleCard
//             key={item.id}
//             title={item.title}
//             source={item.source}
//             image={item.image}
//             time={
//               item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//             }
//             onPress={() => {
//               setOpenUrl(item.link);
//               setOpenTitle(item.title);
//             }}
//           />
//         ))}
//       </ScrollView>

//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* existing Feeds modal */}
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
//             {sources.map((s: FeedSource) => (
//               <View key={s.id} style={styles.sourceRow}>
//                 <View style={{flex: 1}}>
//                   <TextInput
//                     defaultValue={s.name}
//                     placeholder="Name"
//                     placeholderTextColor="rgba(255,255,255,0.4)"
//                     onEndEditing={e => renameSource(s.id, e.nativeEvent.text)}
//                     style={styles.sourceName}
//                   />
//                   <Text style={styles.sourceUrl} numberOfLines={1}>
//                     {s.url}
//                   </Text>
//                 </View>
//                 <Switch
//                   value={!!s.enabled}
//                   onValueChange={v => toggleSource(s.id, v)}
//                   trackColor={{
//                     false: 'rgba(255,255,255,0.18)',
//                     true: '#0A84FF',
//                   }}
//                   thumbColor="#fff"
//                 />
//                 <TouchableOpacity
//                   onPress={() => removeSource(s.id)}
//                   style={styles.removeBtn}>
//                   <Text style={styles.removeText}>Remove</Text>
//                 </TouchableOpacity>
//               </View>
//             ))}
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

//       {/* brands modal */}
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
//             {Array.from(
//               new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//             )
//               .filter(
//                 b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//               )
//               .map(brand => {
//                 const show = !!chipAllowlist[brand];
//                 return (
//                   <View key={brand} style={styles.sourceRow}>
//                     <View style={{flex: 1}}>
//                       <Text style={styles.sourceName}>{brand}</Text>
//                     </View>
//                     <Text style={{color: '#fff', marginRight: 8}}>
//                       Show as Chip
//                     </Text>
//                     <Switch
//                       value={show}
//                       onValueChange={v =>
//                         setChipAllowlist(prev => ({...prev, [brand]: v}))
//                       }
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>
//                 );
//               })}
//           </ScrollView>
//         </View>
//       </Modal>
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
//     maxWidth: 240,
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

////////////////////

// // apps/mobile/src/screens/FashionFeedScreen.tsx
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
// } from 'react-native';
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// dayjs.extend(relativeTime);

// import FeaturedHero from '../components/FashionFeed/FeaturedHero';
// import ArticleCard from '../components/FashionFeed/ArticleCard';
// import TrendChips from '../components/FashionFeed/TrendChips';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {useFashionFeeds} from '../hooks/useFashionFeeds';
// import {useFeedSources} from '../hooks/useFeedSources';
// import {useUUID} from '../context/UUIDContext';

// type Tab = 'For You' | 'Following';

// type Chip = {
//   id: string;
//   label: string;
//   type: 'personal' | 'trending' | 'context';
//   filter: {topics?: string[]; constraints?: any};
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

//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);

//   const {articles, trending, loading, refresh} = useFashionFeeds(
//     enabled.map(s => ({name: s.name, url: s.url})),
//     {userId},
//   );

//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await fetch(
//           'https://example.com/api/user/wardrobe/brands?limit=40&userId=' +
//             userId,
//         );
//         const json = await res.json().catch(() => null);
//         setWardrobeBrands(Array.isArray(json?.brands) ? json.brands : []);
//       } catch {
//         setWardrobeBrands([]);
//       }
//     })();
//   }, [userId]);

//   // 🔹 Build chip objects from wardrobe + trending + context
//   const [chips, setChips] = useState<Chip[]>([]);
//   useEffect(() => {
//     if (!trending?.length && !wardrobeBrands?.length) return;

//     const personal = wardrobeBrands.slice(0, 6).map(b => ({
//       id: 'brand-' + b.toLowerCase(),
//       label: b,
//       type: 'personal' as const,
//       filter: {topics: [b.toLowerCase()]},
//     }));

//     const trendingChips = (trending || []).slice(0, 8).map(t => ({
//       id: 'trend-' + t.toLowerCase().replace(/\s+/g, '-'),
//       label: t,
//       type: 'trending' as const,
//       filter: {topics: [t.toLowerCase()]},
//     }));

//     const context: Chip[] = [
//       {
//         id: 'ctx-hot',
//         label: 'Hot in LA',
//         type: 'context',
//         filter: {constraints: {weather: 'hot'}},
//       },
//     ];

//     setChips([...personal, ...trendingChips, ...context]);
//   }, [trending, wardrobeBrands]);

//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [brandSearch, setBrandSearch] = useState('');

//   const [activeFilter, setActiveFilter] = useState<{topics?: string[]} | null>(
//     null,
//   );

//   const hero = articles[0];
//   const rest = useMemo(
//     () => (articles.length > 1 ? articles.slice(1) : []),
//     [articles],
//   );

//   const filtered = useMemo(() => {
//     if (!activeFilter?.topics?.length) return rest;
//     const terms = activeFilter.topics.map(t => t.toLowerCase());
//     return rest.filter(a =>
//       [a.title, a.source, a.summary].some(x =>
//         terms.some(t => (x || '').toLowerCase().includes(t)),
//       ),
//     );
//   }, [rest, activeFilter]);

//   const [tab, setTab] = useState<Tab>('For You');
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const [manageOpen, setManageOpen] = useState(false);
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

//   return (
//     <View style={styles.container}>
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
//         <View style={styles.topBar}>
//           <Segmented tab={tab} onChange={setTab} />
//           <TouchableOpacity
//             onPress={() => setManageBrandsOpen(true)}
//             style={[styles.manageBtn, {marginRight: 8}]}>
//             <Text style={styles.manageText}>Brands</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={() => setManageOpen(true)}
//             style={styles.manageBtn}>
//             <Text style={styles.manageText}>Feeds</Text>
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

//         <TrendChips
//           items={chips.map(c => c.label)}
//           selected={activeFilter?.topics?.[0] ?? null}
//           onTap={term =>
//             setActiveFilter(prev =>
//               prev?.topics?.[0] === term ? null : {topics: [term]},
//             )
//           }
//           onMore={() => setManageBrandsOpen(true)}
//         />

//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>Fashion News</Text>
//         </View>

//         {filtered.map(item => (
//           <ArticleCard
//             key={item.id}
//             title={item.title}
//             source={item.source}
//             image={item.image}
//             time={
//               item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//             }
//             onPress={() => {
//               setOpenUrl(item.link);
//               setOpenTitle(item.title);
//             }}
//           />
//         ))}
//       </ScrollView>

//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

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
//             {sources.map((s: FeedSource) => (
//               <View key={s.id} style={styles.sourceRow}>
//                 <View style={{flex: 1}}>
//                   <TextInput
//                     defaultValue={s.name}
//                     placeholder="Name"
//                     placeholderTextColor="rgba(255,255,255,0.4)"
//                     onEndEditing={e => renameSource(s.id, e.nativeEvent.text)}
//                     style={styles.sourceName}
//                   />
//                   <Text style={styles.sourceUrl} numberOfLines={1}>
//                     {s.url}
//                   </Text>
//                 </View>
//                 <Switch
//                   value={!!s.enabled}
//                   onValueChange={v => toggleSource(s.id, v)}
//                   trackColor={{
//                     false: 'rgba(255,255,255,0.18)',
//                     true: '#0A84FF',
//                   }}
//                   thumbColor="#fff"
//                 />
//                 <TouchableOpacity
//                   onPress={() => removeSource(s.id)}
//                   style={styles.removeBtn}>
//                   <Text style={styles.removeText}>Remove</Text>
//                 </TouchableOpacity>
//               </View>
//             ))}

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
//             {sources.map((s: FeedSource) => (
//               <View key={s.id} style={styles.sourceRow}>
//                 <View style={{flex: 1}}>
//                   <TextInput
//                     defaultValue={s.name}
//                     placeholder="Name"
//                     placeholderTextColor="rgba(255,255,255,0.4)"
//                     onEndEditing={e => renameSource(s.id, e.nativeEvent.text)}
//                     style={styles.sourceName}
//                   />
//                   <Text style={styles.sourceUrl} numberOfLines={1}>
//                     {s.url}
//                   </Text>
//                 </View>
//                 <Switch
//                   value={!!s.enabled}
//                   onValueChange={v => toggleSource(s.id, v)}
//                   trackColor={{
//                     false: 'rgba(255,255,255,0.18)',
//                     true: '#0A84FF',
//                   }}
//                   thumbColor="#fff"
//                 />
//                 <TouchableOpacity
//                   onPress={() => removeSource(s.id)}
//                   style={styles.removeBtn}>
//                   <Text style={styles.removeText}>Remove</Text>
//                 </TouchableOpacity>
//               </View>
//             ))}

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
//             {Array.from(
//               new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//             )
//               .filter(
//                 b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//               )
//               .map(brand => {
//                 const show = !!chipAllowlist[brand];
//                 return (
//                   <View key={brand} style={styles.sourceRow}>
//                     <View style={{flex: 1}}>
//                       <Text style={styles.sourceName}>{brand}</Text>
//                     </View>
//                     <Text style={{color: '#fff', marginRight: 8}}>
//                       Show as Chip
//                     </Text>
//                     <Switch
//                       value={show}
//                       onValueChange={v =>
//                         setChipAllowlist(prev => ({...prev, [brand]: v}))
//                       }
//                       trackColor={{
//                         false: 'rgba(255,255,255,0.18)',
//                         true: '#0A84FF',
//                       }}
//                       thumbColor="#fff"
//                     />
//                   </View>
//                 );
//               })}
//           </ScrollView>
//         </View>
//       </Modal>
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
//   sectionTitle: {
//     color: '#6600ffff',
//     fontWeight: '800',
//     fontSize: 20,
//   },
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
//     maxWidth: 240,
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

//////////////////

// // apps/mobile/src/screens/FashionFeedScreen.tsx
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
// } from 'react-native';
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// dayjs.extend(relativeTime);

// import FeaturedHero from '../components/FashionFeed/FeaturedHero';
// import ArticleCard from '../components/FashionFeed/ArticleCard';
// import TrendChips from '../components/FashionFeed/TrendChips';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {useFashionFeeds} from '../hooks/useFashionFeeds';
// import {useFeedSources} from '../hooks/useFeedSources';
// import {useUUID} from '../context/UUIDContext';

// type Tab = 'For You' | 'Following';

// type Chip = {
//   id: string;
//   label: string;
//   type: 'personal' | 'trending' | 'context';
//   filter: {topics?: string[]; constraints?: any};
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

//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);

//   const {articles, trending, loading, refresh} = useFashionFeeds(
//     enabled.map(s => ({name: s.name, url: s.url})),
//     {userId},
//   );

//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await fetch(
//           'https://example.com/api/user/wardrobe/brands?limit=40&userId=' +
//             userId,
//         );
//         const json = await res.json().catch(() => null);
//         setWardrobeBrands(Array.isArray(json?.brands) ? json.brands : []);
//       } catch {
//         setWardrobeBrands([]);
//       }
//     })();
//   }, [userId]);

//   // 🔹 Build chip objects from wardrobe + trending + context
//   const [chips, setChips] = useState<Chip[]>([]);
//   useEffect(() => {
//     if (!trending?.length && !wardrobeBrands?.length) return;

//     const personal = wardrobeBrands.slice(0, 6).map(b => ({
//       id: 'brand-' + b.toLowerCase(),
//       label: b,
//       type: 'personal' as const,
//       filter: {topics: [b.toLowerCase()]},
//     }));

//     const trendingChips = (trending || []).slice(0, 8).map(t => ({
//       id: 'trend-' + t.toLowerCase().replace(/\s+/g, '-'),
//       label: t,
//       type: 'trending' as const,
//       filter: {topics: [t.toLowerCase()]},
//     }));

//     const context: Chip[] = [
//       {
//         id: 'ctx-hot',
//         label: 'Hot in LA',
//         type: 'context',
//         filter: {constraints: {weather: 'hot'}},
//       },
//     ];

//     setChips([...personal, ...trendingChips, ...context]);
//   }, [trending, wardrobeBrands]);

//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   );
//   const [brandSearch, setBrandSearch] = useState('');

//   const [activeFilter, setActiveFilter] = useState<{topics?: string[]} | null>(
//     null,
//   );

//   const hero = articles[0];
//   const rest = useMemo(
//     () => (articles.length > 1 ? articles.slice(1) : []),
//     [articles],
//   );

//   const filtered = useMemo(() => {
//     if (!activeFilter?.topics?.length) return rest;
//     const terms = activeFilter.topics.map(t => t.toLowerCase());
//     return rest.filter(a =>
//       [a.title, a.source, a.summary].some(x =>
//         terms.some(t => (x || '').toLowerCase().includes(t)),
//       ),
//     );
//   }, [rest, activeFilter]);

//   const [tab, setTab] = useState<Tab>('For You');
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const [manageOpen, setManageOpen] = useState(false);
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);

//   return (
//     <View style={styles.container}>
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
//         <View style={styles.topBar}>
//           <Segmented tab={tab} onChange={setTab} />
//           <TouchableOpacity
//             onPress={() => setManageBrandsOpen(true)}
//             style={[styles.manageBtn, {marginRight: 8}]}>
//             <Text style={styles.manageText}>Brands</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={() => setManageOpen(true)}
//             style={styles.manageBtn}>
//             <Text style={styles.manageText}>Feeds</Text>
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

//         <TrendChips
//           items={chips.map(c => c.label)}
//           selected={activeFilter?.topics?.[0] ?? null}
//           onTap={term =>
//             setActiveFilter(prev =>
//               prev?.topics?.[0] === term ? null : {topics: [term]},
//             )
//           }
//           onMore={() => setManageBrandsOpen(true)}
//         />

//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>Fashion News</Text>
//         </View>

//         {filtered.map(item => (
//           <ArticleCard
//             key={item.id}
//             title={item.title}
//             source={item.source}
//             image={item.image}
//             time={
//               item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//             }
//             onPress={() => {
//               setOpenUrl(item.link);
//               setOpenTitle(item.title);
//             }}
//           />
//         ))}
//       </ScrollView>

//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

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
//             {sources.map((s: FeedSource) => (
//               <View key={s.id} style={styles.sourceRow}>
//                 <View style={{flex: 1}}>
//                   <TextInput
//                     defaultValue={s.name}
//                     placeholder="Name"
//                     placeholderTextColor="rgba(255,255,255,0.4)"
//                     onEndEditing={e => renameSource(s.id, e.nativeEvent.text)}
//                     style={styles.sourceName}
//                   />
//                   <Text style={styles.sourceUrl} numberOfLines={1}>
//                     {s.url}
//                   </Text>
//                 </View>
//                 <Switch
//                   value={!!s.enabled}
//                   onValueChange={v => toggleSource(s.id, v)}
//                   trackColor={{
//                     false: 'rgba(255,255,255,0.18)',
//                     true: '#0A84FF',
//                   }}
//                   thumbColor="#fff"
//                 />
//                 <TouchableOpacity
//                   onPress={() => removeSource(s.id)}
//                   style={styles.removeBtn}>
//                   <Text style={styles.removeText}>Remove</Text>
//                 </TouchableOpacity>
//               </View>
//             ))}

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
//             {sources.map((s: FeedSource) => (
//               <View key={s.id} style={styles.sourceRow}>
//                 <View style={{flex: 1}}>
//                   <TextInput
//                     defaultValue={s.name}
//                     placeholder="Name"
//                     placeholderTextColor="rgba(255,255,255,0.4)"
//                     onEndEditing={e => renameSource(s.id, e.nativeEvent.text)}
//                     style={styles.sourceName}
//                   />
//                   <Text style={styles.sourceUrl} numberOfLines={1}>
//                     {s.url}
//                   </Text>
//                 </View>
//                 <Switch
//                   value={!!s.enabled}
//                   onValueChange={v => toggleSource(s.id, v)}
//                   trackColor={{
//                     false: 'rgba(255,255,255,0.18)',
//                     true: '#0A84FF',
//                   }}
//                   thumbColor="#fff"
//                 />
//                 <TouchableOpacity
//                   onPress={() => removeSource(s.id)}
//                   style={styles.removeBtn}>
//                   <Text style={styles.removeText}>Remove</Text>
//                 </TouchableOpacity>
//               </View>
//             ))}

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
//   sectionTitle: {
//     color: '#6600ffff',
//     fontWeight: '800',
//     fontSize: 20,
//   },
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
//     maxWidth: 240,
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

////////////////////////

// // apps/mobile/src/screens/FashionFeedScreen.tsx
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
//   FlatList,
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

// type Tab = 'For You' | 'Following';

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

//   const {articles, trending, loading, refresh} = useFashionFeeds(
//     enabled.map(s => ({name: s.name, url: s.url})),
//     {userId},
//   );

//   // 🔹 NEW: filter state for chips
//   const [activeTerm, setActiveTerm] = useState<string | null>(null);

//   // 🔹 NEW: wardrobe brands (placeholder fetch; wire to real API later)
//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
//     (async () => {
//       try {
//         // TODO: replace with your real API: GET /user/wardrobe/brands
//         // Must return array of brand strings e.g., ['Nike','Gucci',...]
//         const res = await fetch(
//           'https://example.com/api/user/wardrobe/brands?limit=40&userId=' +
//             userId,
//         );
//         const json = await res.json().catch(() => null);
//         setWardrobeBrands(Array.isArray(json?.brands) ? json.brands : []);
//       } catch {
//         setWardrobeBrands([]); // fail soft
//       }
//     })();
//   }, [userId]);

//   // 🔹 NEW: manage which brands show as chips
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);
//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   ); // brand -> show?
//   const [brandSearch, setBrandSearch] = useState('');

//   // derive the shortlist of chips (20 max): allowlisted first, then popular trending/wardrobe
//   const mergedChips = useMemo(() => {
//     const pool = [...(trending || []), ...wardrobeBrands];
//     const uniq = Array.from(
//       new Set(pool.map(s => (s || '').trim()).filter(Boolean)),
//     );
//     // if allowlist has any TRUE, prefer only those; otherwise take top 20 uniq
//     const chosen = Object.values(chipAllowlist).some(v => v)
//       ? uniq.filter(b => chipAllowlist[b])
//       : uniq.slice(0, 20);
//     return chosen;
//   }, [trending, wardrobeBrands, chipAllowlist]);

//   // 🔹 filter articles when a chip is active
//   const hero = articles[0];
//   const rest = useMemo(
//     () => (articles.length > 1 ? articles.slice(1) : []),
//     [articles],
//   );

//   const filtered = useMemo(() => {
//     if (!activeTerm) return rest;
//     const needle = activeTerm.toLowerCase();
//     return rest.filter(a =>
//       [a.title, a.source, a.summary].some(x =>
//         (x || '').toLowerCase().includes(needle),
//       ),
//     );
//   }, [rest, activeTerm]);

//   const [tab, setTab] = useState<Tab>('For You');
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const [manageOpen, setManageOpen] = useState(false); // existing Feeds modal
//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);

//   // ----- UI -----
//   return (
//     <View style={styles.container}>
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
//         {/* Top segmented tabs + Manage */}
//         <View style={styles.topBar}>
//           <Segmented tab={tab} onChange={setTab} />
//           <TouchableOpacity
//             onPress={() => setManageBrandsOpen(true)}
//             style={[styles.manageBtn, {marginRight: 8}]}>
//             <Text style={styles.manageText}>Brands</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={() => setManageOpen(true)}
//             style={styles.manageBtn}>
//             <Text style={styles.manageText}>Feeds</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Hero */}
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

//         {/* 🔹 Chips: shortlist; tap to filter; More opens Brands Manager */}
//         <TrendChips
//           items={mergedChips}
//           selected={activeTerm}
//           onTap={term => setActiveTerm(prev => (prev === term ? null : term))}
//           onMore={() => setManageBrandsOpen(true)}
//         />

//         {/* Section title */}
//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>Fashion News</Text>
//         </View>

//         {/* Article rows (filtered) */}
//         {filtered.map(item => (
//           <ArticleCard
//             key={item.id}
//             title={item.title}
//             source={item.source}
//             image={item.image}
//             time={
//               item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//             }
//             onPress={() => {
//               setOpenUrl(item.link);
//               setOpenTitle(item.title);
//             }}
//           />
//         ))}
//       </ScrollView>

//       {/* Reader */}
//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* Existing Manage Feeds Modal (unchanged) */}
//       <Modal
//         visible={manageOpen}
//         animationType="slide"
//         onRequestClose={() => setManageOpen(false)}>
//         {/* ... your existing Feeds modal code ... */}
//       </Modal>

//       {/* 🔹 NEW: Manage Brands Modal */}
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

//           <FlatList
//             data={Array.from(
//               new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//             ).filter(
//               b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//             )}
//             keyExtractor={b => b}
//             contentContainerStyle={{paddingBottom: 32}}
//             renderItem={({item: brand}) => {
//               const show = !!chipAllowlist[brand];
//               return (
//                 <View style={styles.sourceRow}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.sourceName}>{brand}</Text>
//                     {/* optional: show count of items for this brand */}
//                   </View>
//                   <Text style={{color: '#fff', marginRight: 8}}>
//                     Show as Chip
//                   </Text>
//                   <Switch
//                     value={show}
//                     onValueChange={v =>
//                       setChipAllowlist(prev => ({...prev, [brand]: v}))
//                     }
//                     trackColor={{
//                       false: 'rgba(255,255,255,0.18)',
//                       true: '#0A84FF',
//                     }}
//                     thumbColor="#fff"
//                   />
//                 </View>
//               );
//             }}
//           />
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, backgroundColor: '#000'},
//   topBar: {
//     paddingTop: 8,
//     paddingHorizontal: 16,
//     paddingBottom: 6,
//     backgroundColor: '#000',
//     flexDirection: 'row',
//     alignItems: 'center',
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
//   sectionTitle: {
//     color: '#6600ffff',
//     fontWeight: '800',
//     fontSize: 20,
//   },

//   // modal
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
//   input: {
//     backgroundColor: 'rgba(255,255,255,0.06)',
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     color: '#fff',
//   },
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
//     maxWidth: 240,
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

////////////////////////

// // apps/mobile/src/screens/FashionFeedScreen.tsx
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
//   FlatList,
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

// type Tab = 'For You' | 'Following';

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

//   const {articles, trending, loading, refresh} = useFashionFeeds(
//     enabled.map(s => ({name: s.name, url: s.url})),
//     {userId},
//   );

//   // 🔹 NEW: filter state for chips
//   const [activeTerm, setActiveTerm] = useState<string | null>(null);

//   // 🔹 NEW: wardrobe brands (placeholder fetch; wire to real API later)
//   const [wardrobeBrands, setWardrobeBrands] = useState<string[]>([]);
//   useEffect(() => {
//     (async () => {
//       try {
//         // TODO: replace with your real API: GET /user/wardrobe/brands
//         // Must return array of brand strings e.g., ['Nike','Gucci',...]
//         const res = await fetch(
//           'https://example.com/api/user/wardrobe/brands?limit=40&userId=' +
//             userId,
//         );
//         const json = await res.json().catch(() => null);
//         setWardrobeBrands(Array.isArray(json?.brands) ? json.brands : []);
//       } catch {
//         setWardrobeBrands([]); // fail soft
//       }
//     })();
//   }, [userId]);

//   // 🔹 NEW: manage which brands show as chips
//   const [manageBrandsOpen, setManageBrandsOpen] = useState(false);
//   const [chipAllowlist, setChipAllowlist] = useState<Record<string, boolean>>(
//     {},
//   ); // brand -> show?
//   const [brandSearch, setBrandSearch] = useState('');

//   // derive the shortlist of chips (20 max): allowlisted first, then popular trending/wardrobe
//   const mergedChips = useMemo(() => {
//     const pool = [...(trending || []), ...wardrobeBrands];
//     const uniq = Array.from(
//       new Set(pool.map(s => (s || '').trim()).filter(Boolean)),
//     );
//     // if allowlist has any TRUE, prefer only those; otherwise take top 20 uniq
//     const chosen = Object.values(chipAllowlist).some(v => v)
//       ? uniq.filter(b => chipAllowlist[b])
//       : uniq.slice(0, 20);
//     return chosen;
//   }, [trending, wardrobeBrands, chipAllowlist]);

//   // 🔹 filter articles when a chip is active
//   const hero = articles[0];
//   const rest = useMemo(
//     () => (articles.length > 1 ? articles.slice(1) : []),
//     [articles],
//   );

//   const filtered = useMemo(() => {
//     if (!activeTerm) return rest;
//     const needle = activeTerm.toLowerCase();
//     return rest.filter(a =>
//       [a.title, a.source, a.summary].some(x =>
//         (x || '').toLowerCase().includes(needle),
//       ),
//     );
//   }, [rest, activeTerm]);

//   const [tab, setTab] = useState<Tab>('For You');
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const [manageOpen, setManageOpen] = useState(false); // existing Feeds modal
//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);

//   // ----- UI -----
//   return (
//     <View style={styles.container}>
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
//         {/* Top segmented tabs + Manage */}
//         <View style={styles.topBar}>
//           <Segmented tab={tab} onChange={setTab} />
//           <TouchableOpacity
//             onPress={() => setManageBrandsOpen(true)}
//             style={[styles.manageBtn, {marginRight: 8}]}>
//             <Text style={styles.manageText}>Brands</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={() => setManageOpen(true)}
//             style={styles.manageBtn}>
//             <Text style={styles.manageText}>Feeds</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Hero */}
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

//         {/* 🔹 Chips: shortlist; tap to filter; More opens Brands Manager */}
//         <TrendChips
//           items={mergedChips}
//           selected={activeTerm}
//           onTap={term => setActiveTerm(prev => (prev === term ? null : term))}
//           onMore={() => setManageBrandsOpen(true)}
//         />

//         {/* Section title */}
//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>Fashion News</Text>
//         </View>

//         {/* Article rows (filtered) */}
//         {filtered.map(item => (
//           <ArticleCard
//             key={item.id}
//             title={item.title}
//             source={item.source}
//             image={item.image}
//             time={
//               item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//             }
//             onPress={() => {
//               setOpenUrl(item.link);
//               setOpenTitle(item.title);
//             }}
//           />
//         ))}
//       </ScrollView>

//       {/* Reader */}
//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* Existing Manage Feeds Modal (unchanged) */}
//       <Modal
//         visible={manageOpen}
//         animationType="slide"
//         onRequestClose={() => setManageOpen(false)}>
//         {/* ... your existing Feeds modal code ... */}
//       </Modal>

//       {/* 🔹 NEW: Manage Brands Modal */}
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

//           <FlatList
//             data={Array.from(
//               new Set([...wardrobeBrands].sort((a, b) => a.localeCompare(b))),
//             ).filter(
//               b => b && b.toLowerCase().includes(brandSearch.toLowerCase()),
//             )}
//             keyExtractor={b => b}
//             contentContainerStyle={{paddingBottom: 32}}
//             renderItem={({item: brand}) => {
//               const show = !!chipAllowlist[brand];
//               return (
//                 <View style={styles.sourceRow}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.sourceName}>{brand}</Text>
//                     {/* optional: show count of items for this brand */}
//                   </View>
//                   <Text style={{color: '#fff', marginRight: 8}}>
//                     Show as Chip
//                   </Text>
//                   <Switch
//                     value={show}
//                     onValueChange={v =>
//                       setChipAllowlist(prev => ({...prev, [brand]: v}))
//                     }
//                     trackColor={{
//                       false: 'rgba(255,255,255,0.18)',
//                       true: '#0A84FF',
//                     }}
//                     thumbColor="#fff"
//                   />
//                 </View>
//               );
//             }}
//           />
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, backgroundColor: '#000'},
//   topBar: {
//     paddingTop: 8,
//     paddingHorizontal: 16,
//     paddingBottom: 6,
//     backgroundColor: '#000',
//     flexDirection: 'row',
//     alignItems: 'center',
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
//   sectionTitle: {
//     color: '#6600ffff',
//     fontWeight: '800',
//     fontSize: 20,
//   },

//   // modal
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
//   input: {
//     backgroundColor: 'rgba(255,255,255,0.06)',
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     color: '#fff',
//   },
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
//     maxWidth: 240,
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

////////////////////////

// // apps/mobile/src/screens/FashionFeedScreen.tsx
// import React, {useMemo, useState} from 'react';
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

// type Tab = 'For You' | 'Following';

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

//   const {articles, trending, loading, refresh} = useFashionFeeds(
//     enabled.map(s => ({name: s.name, url: s.url})),
//     {userId},
//   );
//   const [tab, setTab] = useState<Tab>('For You');
//   const [openUrl, setOpenUrl] = useState<string | undefined>();
//   const [openTitle, setOpenTitle] = useState<string | undefined>();
//   const [manageOpen, setManageOpen] = useState(false);
//   const [newName, setNewName] = useState('');
//   const [newUrl, setNewUrl] = useState('');
//   const [addError, setAddError] = useState<string | null>(null);

//   const hero = articles[0];
//   const data = useMemo(
//     () => (articles.length > 1 ? articles.slice(1) : []),
//     [articles],
//   );

//   return (
//     <View style={styles.container}>
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
//         {/* Top segmented tabs + Manage */}
//         <View style={styles.topBar}>
//           <Segmented tab={tab} onChange={setTab} />
//           <TouchableOpacity
//             onPress={() => setManageOpen(true)}
//             style={styles.manageBtn}>
//             <Text style={styles.manageText}>Manage</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Hero */}
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

//         {/* Trending chips */}
//         <TrendChips items={trending} onTap={() => {}} />

//         {/* Section title */}
//         <View style={styles.sectionHeader}>
//           <Text style={styles.sectionTitle}>Fashion News</Text>
//         </View>

//         {/* Article rows */}
//         {data.map(item => (
//           <ArticleCard
//             key={item.id}
//             title={item.title}
//             source={item.source}
//             image={item.image}
//             time={
//               item.publishedAt ? dayjs(item.publishedAt).fromNow() : undefined
//             }
//             onPress={() => {
//               setOpenUrl(item.link);
//               setOpenTitle(item.title);
//             }}
//           />
//         ))}
//       </ScrollView>

//       {/* Reader */}
//       <ReaderModal
//         visible={!!openUrl}
//         url={openUrl}
//         title={openTitle}
//         onClose={() => setOpenUrl(undefined)}
//       />

//       {/* Manage Feeds Modal */}
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
//             {sources.map((s: FeedSource) => (
//               <View key={s.id} style={styles.sourceRow}>
//                 <View style={{flex: 1}}>
//                   <TextInput
//                     defaultValue={s.name}
//                     placeholder="Name"
//                     placeholderTextColor="rgba(255,255,255,0.4)"
//                     onEndEditing={e => renameSource(s.id, e.nativeEvent.text)}
//                     style={styles.sourceName}
//                   />
//                   <Text style={styles.sourceUrl} numberOfLines={1}>
//                     {s.url}
//                   </Text>
//                 </View>
//                 <Switch
//                   value={!!s.enabled}
//                   onValueChange={v => toggleSource(s.id, v)}
//                   trackColor={{
//                     false: 'rgba(255,255,255,0.18)',
//                     true: '#0A84FF',
//                   }}
//                   thumbColor="#fff"
//                 />
//                 <TouchableOpacity
//                   onPress={() => removeSource(s.id)}
//                   style={styles.removeBtn}>
//                   <Text style={styles.removeText}>Remove</Text>
//                 </TouchableOpacity>
//               </View>
//             ))}

//             {/* Add new */}
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
//     </View>
//   );
// }

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

// const styles = StyleSheet.create({
//   container: {flex: 1, backgroundColor: '#000'},
//   topBar: {
//     paddingTop: 8,
//     paddingHorizontal: 16,
//     paddingBottom: 6,
//     backgroundColor: '#000',
//     flexDirection: 'row',
//     alignItems: 'center',
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
//   sectionTitle: {
//     color: '#6600ffff',
//     fontWeight: '800',
//     fontSize: 20,
//   },

//   // modal
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
//   input: {
//     backgroundColor: 'rgba(255,255,255,0.06)',
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     color: '#fff',
//   },
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
// });

// const seg = StyleSheet.create({
//   root: {
//     height: 36,
//     backgroundColor: 'rgba(73, 73, 73, 1)',
//     borderRadius: 10,
//     padding: 3,
//     flexDirection: 'row',
//     flex: 1,
//     maxWidth: 240,
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
