import React, {useMemo} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import {useUUID} from '../../context/UUIDContext';
import {useFeedSources} from '../../hooks/useFeedSources';
import {useFashionFeeds} from '../../hooks/useFashionFeeds';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

type Article = {
  id: string | number;
  title: string;
  source: string;
  image?: string | null;
  link: string;
  publishedAt?: string;
};

const NewsCarousel: React.FC = () => {
  const userId = useUUID() ?? '';
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  // Respect the user’s enabled sources; fall back to defaults if none toggled yet
  const {sources, enabled} = useFeedSources({userId});
  const activeFeeds = (enabled?.length ? enabled : sources).map(fs => ({
    name: fs.name,
    url: fs.url,
  }));

  const {articles, loading, error} = useFashionFeeds(activeFeeds, {userId});

  const topTen: Article[] = useMemo(() => {
    const list = Array.isArray(articles) ? articles : [];
    // Prefer chronologically recent first if hook isn’t already sorted
    const byTime = [...list].sort((a, b) => {
      const ta = a?.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b?.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    });
    return byTime.slice(0, 10);
  }, [articles]);

  const styles = StyleSheet.create({
    card: {
      width: 220,
      marginRight: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surface2,
      overflow: 'hidden',
      borderWidth: tokens.borderWidth.md,
      borderColor: theme.colors.surfaceBorder,
    },
    image: {
      width: '100%',
      height: 120,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: tokens.borderWidth.md,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    title: {
      color: theme.colors.foreground,
      fontSize: 14,
      fontWeight: '700',
      marginHorizontal: 10,
      marginTop: 8,
    },
    source: {
      fontSize: 12,
      color: theme.colors.foreground2,
      marginHorizontal: 10,
      marginBottom: 10,
      marginTop: 4,
      fontWeight: '500',
    },
    placeholder: {
      width: '100%',
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
  });

  if (loading && !topTen.length)
    return <Text style={{padding: 16}}>Loading…</Text>;
  if (error && !topTen.length)
    return <Text style={{padding: 16}}>{String(error)}</Text>;
  if (!topTen.length)
    return <Text style={{padding: 16, color: '#666'}}>No stories found</Text>;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{paddingRight: 8}}>
      {topTen.map(a => (
        <AppleTouchFeedback
          key={String(a.id)}
          style={styles.card}
          hapticStyle="impactLight"
          onPress={() => a.link && Linking.openURL(a.link)}>
          {a.image ? (
            <Image
              source={{uri: a.image}}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={{color: theme.colors.foreground3, fontSize: 12}}>
                No image
              </Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={2}>
            {a.title || 'Untitled'}
          </Text>
          <Text style={styles.source} numberOfLines={1}>
            {a.source || 'Fashion News'}
          </Text>
        </AppleTouchFeedback>
      ))}
    </ScrollView>
  );
};

export default NewsCarousel;

///////////////

// import React, {useMemo} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Linking,
//   StyleSheet,
// } from 'react-native';
// import {useUUID} from '../../context/UUIDContext';
// import {useFeedSources} from '../../hooks/useFeedSources';
// import {useFashionFeeds} from '../../hooks/useFashionFeeds';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type Article = {
//   id: string | number;
//   title: string;
//   source: string;
//   image?: string | null;
//   link: string;
//   publishedAt?: string;
// };

// const NewsCarousel: React.FC = () => {
//   const userId = useUUID() ?? '';
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   // Respect the user’s enabled sources; fall back to defaults if none toggled yet
//   const {sources, enabled} = useFeedSources({userId});
//   const activeFeeds = (enabled?.length ? enabled : sources).map(fs => ({
//     name: fs.name,
//     url: fs.url,
//   }));

//   const {articles, loading, error} = useFashionFeeds(activeFeeds, {userId});

//   const topTen: Article[] = useMemo(() => {
//     const list = Array.isArray(articles) ? articles : [];
//     // Prefer chronologically recent first if hook isn’t already sorted
//     const byTime = [...list].sort((a, b) => {
//       const ta = a?.publishedAt ? Date.parse(a.publishedAt) : 0;
//       const tb = b?.publishedAt ? Date.parse(b.publishedAt) : 0;
//       return tb - ta;
//     });
//     return byTime.slice(0, 10);
//   }, [articles]);

//   const styles = StyleSheet.create({
//     card: {
//       width: 220,
//       marginRight: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface2,
//       overflow: 'hidden',
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     image: {
//       width: '100%',
//       height: 120,
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: tokens.borderWidth.md,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     title: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '700',
//       marginHorizontal: 10,
//       marginTop: 8,
//     },
//     source: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       marginHorizontal: 10,
//       marginBottom: 10,
//       marginTop: 4,
//       fontWeight: '500',
//     },
//     placeholder: {
//       width: '100%',
//       height: 120,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.surface,
//     },
//   });

//   if (loading && !topTen.length)
//     return <Text style={{padding: 16}}>Loading…</Text>;
//   if (error && !topTen.length)
//     return <Text style={{padding: 16}}>{String(error)}</Text>;
//   if (!topTen.length)
//     return <Text style={{padding: 16, color: '#666'}}>No stories found</Text>;

//   return (
//     <ScrollView
//       horizontal
//       showsHorizontalScrollIndicator={false}
//       contentContainerStyle={{paddingRight: 8}}>
//       {topTen.map(a => (
//         <TouchableOpacity
//           key={String(a.id)}
//           style={styles.card}
//           onPress={() => a.link && Linking.openURL(a.link)}
//           activeOpacity={0.9}>
//           {a.image ? (
//             <Image
//               source={{uri: a.image}}
//               style={styles.image}
//               resizeMode="cover"
//             />
//           ) : (
//             <View style={styles.placeholder}>
//               <Text style={{color: theme.colors.foreground3, fontSize: 12}}>
//                 No image
//               </Text>
//             </View>
//           )}
//           <Text style={styles.title} numberOfLines={2}>
//             {a.title || 'Untitled'}
//           </Text>
//           <Text style={styles.source} numberOfLines={1}>
//             {a.source || 'Fashion News'}
//           </Text>
//         </TouchableOpacity>
//       ))}
//     </ScrollView>
//   );
// };

// export default NewsCarousel;

///////////////

// import React, {useMemo} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Linking,
//   StyleSheet,
// } from 'react-native';
// import {useUUID} from '../../context/UUIDContext';
// import {useFeedSources} from '../../hooks/useFeedSources';
// import {useFashionFeeds} from '../../hooks/useFashionFeeds';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type Article = {
//   id: string | number;
//   title: string;
//   source: string;
//   image?: string | null;
//   link: string;
//   publishedAt?: string;
// };

// const NewsCarousel: React.FC = () => {
//   const userId = useUUID() ?? '';
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   // Respect the user’s enabled sources; fall back to defaults if none toggled yet
//   const {sources, enabled} = useFeedSources({userId});
//   const activeFeeds = (enabled?.length ? enabled : sources).map(fs => ({
//     name: fs.name,
//     url: fs.url,
//   }));

//   const {articles, loading, error} = useFashionFeeds(activeFeeds, {userId});

//   const topTen: Article[] = useMemo(() => {
//     const list = Array.isArray(articles) ? articles : [];
//     // Prefer chronologically recent first if hook isn’t already sorted
//     const byTime = [...list].sort((a, b) => {
//       const ta = a?.publishedAt ? Date.parse(a.publishedAt) : 0;
//       const tb = b?.publishedAt ? Date.parse(b.publishedAt) : 0;
//       return tb - ta;
//     });
//     return byTime.slice(0, 10);
//   }, [articles]);

//   const styles = StyleSheet.create({
//     card: {
//       width: 220,
//       marginHorizontal: 8,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface2,
//       overflow: 'hidden',
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     image: {
//       width: '100%',
//       height: 120,
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: tokens.borderWidth.md,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     title: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '700',
//       marginHorizontal: 10,
//       marginTop: 8,
//     },
//     source: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       marginHorizontal: 10,
//       marginBottom: 10,
//       marginTop: 4,
//       fontWeight: '500',
//     },
//     placeholder: {
//       width: '100%',
//       height: 120,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.surface,
//     },
//   });

//   if (loading && !topTen.length)
//     return <Text style={{padding: 16}}>Loading…</Text>;
//   if (error && !topTen.length)
//     return <Text style={{padding: 16}}>{String(error)}</Text>;
//   if (!topTen.length)
//     return <Text style={{padding: 16, color: '#666'}}>No stories found</Text>;

//   return (
//     <ScrollView
//       horizontal
//       showsHorizontalScrollIndicator={false}
//       contentContainerStyle={{paddingRight: 8}}>
//       {topTen.map(a => (
//         <TouchableOpacity
//           key={String(a.id)}
//           style={styles.card}
//           onPress={() => a.link && Linking.openURL(a.link)}
//           activeOpacity={0.9}>
//           {a.image ? (
//             <Image
//               source={{uri: a.image}}
//               style={styles.image}
//               resizeMode="cover"
//             />
//           ) : (
//             <View style={styles.placeholder}>
//               <Text style={{color: theme.colors.foreground3, fontSize: 12}}>
//                 No image
//               </Text>
//             </View>
//           )}
//           <Text style={styles.title} numberOfLines={2}>
//             {a.title || 'Untitled'}
//           </Text>
//           <Text style={styles.source} numberOfLines={1}>
//             {a.source || 'Fashion News'}
//           </Text>
//         </TouchableOpacity>
//       ))}
//     </ScrollView>
//   );
// };

// export default NewsCarousel;
