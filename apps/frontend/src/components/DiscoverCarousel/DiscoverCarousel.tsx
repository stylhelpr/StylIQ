import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import {API_BASE_URL} from '../../config/api';
import {useUUID} from '../../context/UUIDContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

type Product = {
  id: string;
  title: string;
  brand: string;
  image_url: string;
  link: string;
  category: string;
};

const DiscoverCarousel: React.FC = () => {
  const userId = useUUID();
  const [ready, setReady] = useState(false);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    card: {
      width: 160,
      marginRight: 12,
      borderRadius: 20,
      backgroundColor: theme.colors.surface2,
      overflow: 'hidden',
      borderWidth: tokens.borderWidth.md,
      borderColor: theme.colors.surfaceBorder,
    },
    image: {
      width: '100%',
      height: 120,
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.surfaceBorder,
      borderBottomWidth: tokens.borderWidth.md,
    },
    title: {
      color: theme.colors.foreground,
      fontSize: 14,
      fontWeight: '600',
      marginHorizontal: 8,
      marginTop: 6,
    },
    brand: {
      fontSize: 12,
      color: theme.colors.foreground2,
      marginHorizontal: 8,
      marginBottom: 8,
      marginTop: 4,
      fontWeight: '500',
    },
  });

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready || !userId) return;
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(
          `${API_BASE_URL}/discover/${encodeURIComponent(userId)}`,
        );
        if (!resp.ok) throw new Error(`Failed (${resp.status})`);
        const data = await resp.json();
        const items: Product[] = data
          .map((p: any) => ({
            id: String(p.id),
            title: p.title,
            brand: p.brand,
            image_url: p.image_url,
            link: p.link,
            category: p.category,
          }))
          .filter(p => p.image_url?.startsWith('http'));
        setRecommended(items);
        setError(null);
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, userId]);

  if (!ready || loading) return <Text style={{padding: 16}}>Loading…</Text>;
  if (error && recommended.length === 0)
    return <Text style={{padding: 16}}>{error}</Text>;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {recommended.length === 0 ? (
        <Text style={{padding: 16, color: '#666'}}>No picks found</Text>
      ) : (
        recommended.map(item => (
          <AppleTouchFeedback
            key={item.id}
            style={styles.card}
            hapticStyle="impactLight"
            onPress={() => Linking.openURL(item.link || '#')}>
            <Image
              source={{uri: item.image_url}}
              style={styles.image}
              resizeMode="cover"
              onError={() => console.warn('⚠️ image failed', item.image_url)}
            />
            <Text style={styles.title} numberOfLines={1}>
              {item.title || 'Untitled'}
            </Text>
            <Text style={styles.brand}>{item.brand || 'Brand'}</Text>
          </AppleTouchFeedback>
        ))
      )}
    </ScrollView>
  );
};

export default DiscoverCarousel;

///////////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Linking,
//   StyleSheet,
// } from 'react-native';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext';

// type Product = {
//   id: string;
//   title: string;
//   brand: string;
//   image_url: string;
//   link: string;
//   category: string;
// };

// const DiscoverCarousel: React.FC = () => {
//   const userId = useUUID(); // ✅ internal id used everywhere else
//   const [ready, setReady] = useState(false);
//   const [recommended, setRecommended] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const t = setTimeout(() => setReady(true), 300);
//     return () => clearTimeout(t);
//   }, []);

//   useEffect(() => {
//     if (!ready || !userId) return;
//     (async () => {
//       setLoading(true);
//       try {
//         const resp = await fetch(
//           `${API_BASE_URL}/discover/${encodeURIComponent(userId)}`,
//         );
//         if (!resp.ok) throw new Error(`Failed (${resp.status})`);
//         const data = await resp.json();
//         const items: Product[] = data
//           .map((p: any) => ({
//             id: String(p.id),
//             title: p.title,
//             brand: p.brand,
//             image_url: p.image_url,
//             link: p.link,
//             category: p.category,
//           }))
//           .filter(p => p.image_url?.startsWith('http'));
//         setRecommended(items);
//         setError(null);
//       } catch (e: any) {
//         setError(e.message || 'Failed to load');
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [ready, userId]);

//   if (!ready || loading) return <Text style={{padding: 16}}>Loading…</Text>;
//   if (error && recommended.length === 0)
//     return <Text style={{padding: 16}}>{error}</Text>;

//   return (
//     <View style={styles.container}>
//       <Text style={styles.heading}>Discover Picks For You</Text>
//       <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//         {recommended.length === 0 ? (
//           <Text style={{padding: 16, color: '#666'}}>No picks found</Text>
//         ) : (
//           recommended.map(item => (
//             <TouchableOpacity
//               key={item.id}
//               style={styles.card}
//               onPress={() => Linking.openURL(item.link || '#')}>
//               <Image
//                 source={{uri: item.image_url}}
//                 style={styles.image}
//                 resizeMode="cover"
//                 onError={() => console.warn('⚠️ image failed', item.image_url)}
//               />
//               <Text style={styles.title} numberOfLines={1}>
//                 {item.title || 'Untitled'}
//               </Text>
//               <Text style={styles.brand}>{item.brand || 'Brand'}</Text>
//             </TouchableOpacity>
//           ))
//         )}
//       </ScrollView>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {marginTop: 24},
//   heading: {
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 12,
//     paddingHorizontal: 16,
//   },
//   card: {
//     width: 160,
//     marginHorizontal: 8,
//     borderRadius: 12,
//     backgroundColor: '#f7f7f7',
//     overflow: 'hidden',
//   },
//   image: {width: '100%', height: 180, backgroundColor: '#ddd'},
//   title: {fontSize: 14, fontWeight: '500', marginHorizontal: 8, marginTop: 6},
//   brand: {fontSize: 12, color: '#666', marginHorizontal: 8, marginBottom: 8},
// });

// export default DiscoverCarousel;
