import React, {useEffect, useState, useRef, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {Screen} from '../navigation/types';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HistoryItem {
  id: string;
  scheduled_for: string;
  outfit_name: string;
  worn_at: string | null;
}

interface HistorySection {
  title: string;
  sortKey: string;
  data: HistoryItem[];
}

interface Props {
  navigate: (screen: Screen, params?: any) => void;
}

export default function OutfitHistoryScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const uuid = useUUID();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const containerRef = useRef<Animatable.View & View>(null);

  const handleClose = async () => {
    if (containerRef.current) {
      await (containerRef.current as any).fadeOutDown(300);
    }
    navigate('SavedOutfits');
  };

  useEffect(() => {
    if (!uuid) return;
    fetch(`${API_BASE_URL}/scheduled-outfits/history/${uuid}`)
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [uuid]);

  // Group history items by month/year
  const sections = useMemo((): HistorySection[] => {
    const groups: Record<string, HistoryItem[]> = {};
    const now = new Date();
    const currentYear = now.getFullYear();

    history.forEach(item => {
      const d = new Date(item.scheduled_for);
      const year = d.getFullYear();
      const sortKey = `${year}-${String(d.getMonth()).padStart(2, '0')}`;

      if (!groups[sortKey]) {
        groups[sortKey] = [];
      }
      groups[sortKey].push(item);
    });

    // Sort sections by date (most recent first) and create section objects
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([sortKey, data]) => {
        const d = new Date(data[0].scheduled_for);
        const year = d.getFullYear();
        const month = d.toLocaleDateString('en-US', {month: 'long'});
        const title = year === currentYear ? month : `${month} ${year}`;
        return {title, sortKey, data};
      });
  }, [history]);

  // Expand first section by default when sections are first loaded
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (sections.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      setExpandedSections(new Set([sections[0].sortKey]));
    }
  }, [sections]);

  const toggleSection = (sortKey: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sortKey)) {
        next.delete(sortKey);
      } else {
        next.add(sortKey);
      }
      return next;
    });
  };

  const formatDayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
    });
  };

  const renderSection = (section: HistorySection, sectionIndex: number) => {
    const isExpanded = expandedSections.has(section.sortKey);

    return (
      <Animatable.View
        key={section.sortKey}
        animation="fadeInUp"
        delay={sectionIndex * 60}
        duration={400}
        useNativeDriver
        style={styles.section}>
        <Pressable
          onPress={() => toggleSection(section.sortKey)}
          style={styles.sectionHeader}>
          <MaterialIcons
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color="#888"
          />
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{section.data.length}</Text>
          </View>
        </Pressable>

        {isExpanded && (
          <View style={styles.sectionContent}>
            {section.data.map((item, idx) => (
              <Animatable.View
                key={item.id}
                animation="fadeIn"
                delay={Math.min(idx * 30, 200)}
                duration={250}
                useNativeDriver
                style={styles.row}>
                <Text style={styles.date}>
                  {formatDayDate(item.scheduled_for)}
                </Text>
                <Text style={styles.name} numberOfLines={1}>
                  {item.outfit_name}
                </Text>
              </Animatable.View>
            ))}
          </View>
        )}
      </Animatable.View>
    );
  };

  return (
    <Animatable.View
      ref={containerRef}
      animation="fadeIn"
      duration={300}
      useNativeDriver
      style={{flex: 1}}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <Animatable.View
          animation="fadeInDown"
          duration={500}
          useNativeDriver
          style={styles.header}>
          <Animatable.Text
            animation="fadeInLeft"
            delay={100}
            duration={600}
            useNativeDriver
            style={styles.title}>
            Outfit History
          </Animatable.Text>
          <Animatable.View
            animation="fadeIn"
            delay={200}
            duration={400}
            useNativeDriver>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="black" />
            </TouchableOpacity>
          </Animatable.View>
        </Animatable.View>
        {loading ? (
          <Animatable.View animation="fadeIn" duration={300} useNativeDriver>
            <ActivityIndicator color="#fff" style={{marginTop: 40}} />
          </Animatable.View>
        ) : history.length === 0 ? (
          <Animatable.Text
            animation="fadeIn"
            delay={300}
            duration={500}
            useNativeDriver
            style={styles.empty}>
            No outfit history yet
          </Animatable.Text>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}>
            {sections.map((section, index) => renderSection(section, index))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 45,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'white',
  },
  list: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginLeft: 8,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
  },
  sectionContent: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    marginLeft: 4,
  },
  date: {
    fontSize: 14,
    color: '#888',
    width: 70,
  },
  name: {
    fontSize: 15,
    color: '#fff',
    flex: 1,
  },
  empty: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});

///////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   ActivityIndicator,
// } from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';
// import {Screen} from '../navigation/types';

// interface HistoryItem {
//   id: string;
//   scheduled_for: string;
//   outfit_name: string;
// }

// interface Props {
//   navigate: (screen: Screen, params?: any) => void;
// }

// export default function OutfitHistoryScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const uuid = useUUID();
//   const [history, setHistory] = useState<HistoryItem[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!uuid) return;
//     fetch(`${API_BASE_URL}/scheduled-outfits/history/${uuid}`)
//       .then(res => res.json())
//       .then(data => {
//         setHistory(data);
//         setLoading(false);
//       })
//       .catch(() => setLoading(false));
//   }, [uuid]);

//   const formatDate = (dateStr: string) => {
//     const d = new Date(dateStr);
//     return d.toLocaleDateString('en-US', {
//       weekday: 'short',
//       month: 'short',
//       day: 'numeric',
//     });
//   };

//   const renderItem = ({item}: {item: HistoryItem}) => (
//     <View style={styles.row}>
//       <Text style={styles.date}>{formatDate(item.scheduled_for)}</Text>
//       <Text style={styles.name}>{item.outfit_name}</Text>
//     </View>
//   );

//   return (
//     <GradientBackground>
//       <SafeAreaView style={styles.container} edges={['top']}>
//         <Text style={styles.title}>Outfit History</Text>
//         {loading ? (
//           <ActivityIndicator color="#fff" style={{marginTop: 40}} />
//         ) : history.length === 0 ? (
//           <Text style={styles.empty}>No outfit history yet</Text>
//         ) : (
//           <FlatList
//             data={history}
//             keyExtractor={item => item.id}
//             renderItem={renderItem}
//             contentContainerStyle={styles.list}
//           />
//         )}
//       </SafeAreaView>
//     </GradientBackground>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingHorizontal: 16,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '700',
//     color: '#fff',
//     marginTop: 16,
//     marginBottom: 20,
//   },
//   list: {
//     paddingBottom: 100,
//   },
//   row: {
//     flexDirection: 'row',
//     paddingVertical: 14,
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(255,255,255,0.1)',
//   },
//   date: {
//     fontSize: 14,
//     color: '#888',
//     width: 100,
//   },
//   name: {
//     fontSize: 16,
//     color: '#fff',
//     flex: 1,
//   },
//   empty: {
//     color: '#666',
//     fontSize: 16,
//     textAlign: 'center',
//     marginTop: 40,
//   },
// });
