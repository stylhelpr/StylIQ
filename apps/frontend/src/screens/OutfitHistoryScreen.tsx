import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {Screen} from '../navigation/types';

interface HistoryItem {
  id: string;
  scheduled_for: string;
  outfit_name: string;
  worn_at: string | null;
}

interface Props {
  navigate: (screen: Screen, params?: any) => void;
}

export default function OutfitHistoryScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const uuid = useUUID();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderItem = ({item}: {item: HistoryItem}) => (
    <View style={styles.row}>
      <Text style={styles.date}>{formatDate(item.scheduled_for)}</Text>
      <Text style={styles.name}>{item.outfit_name}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Outfit History</Text>
      {loading ? (
        <ActivityIndicator color="#fff" style={{marginTop: 40}} />
      ) : history.length === 0 ? (
        <Text style={styles.empty}>No outfit history yet</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 20,
  },
  list: {
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  checkbox: {
    marginRight: 12,
  },
  date: {
    fontSize: 14,
    color: '#888',
    width: 90,
  },
  name: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  worn: {
    color: '#4CAF50',
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
