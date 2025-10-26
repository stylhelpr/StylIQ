import React, {useMemo, useEffect, useRef} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Linking,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import {useUUID} from '../../context/UUIDContext';
import {useFeedSources} from '../../hooks/useFeedSources';
import {useFashionFeeds} from '../../hooks/useFashionFeeds';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
import {TooltipBubble} from '../../components/ToolTip/ToolTip1';

type Article = {
  id: string | number;
  title: string;
  source: string;
  image?: string | null;
  link: string;
  publishedAt?: string;
};

type NewsCarouselProps = {
  onOpenArticle?: (url: string, title?: string) => void;
};

const NewsCarousel: React.FC<NewsCarouselProps> = ({onOpenArticle}) => {
  const userId = useUUID() ?? '';
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const {sources, enabled} = useFeedSources({userId});
  const activeFeeds = useMemo(
    () =>
      (enabled?.length ? enabled : sources).map(fs => ({
        name: fs.name,
        url: fs.url,
      })),
    [enabled, sources],
  );

  const {articles, loading, error} = useFashionFeeds(activeFeeds, {userId});

  const topTen: Article[] = useMemo(() => {
    const list = Array.isArray(articles) ? articles : [];
    return [...list]
      .sort((a, b) => {
        const ta = a?.publishedAt ? Date.parse(a.publishedAt) : 0;
        const tb = b?.publishedAt ? Date.parse(b.publishedAt) : 0;
        return tb - ta;
      })
      .slice(0, 10);
  }, [articles]);

  // ✅ Store animations in a ref, but reset if article count changes
  const fadeAnims = useRef<Animated.Value[]>([]);
  const translateAnims = useRef<Animated.Value[]>([]);

  useEffect(() => {
    fadeAnims.current = topTen.map(() => new Animated.Value(0));
    translateAnims.current = topTen.map(() => new Animated.Value(20));

    const animations = topTen.map((_, i) => [
      Animated.timing(fadeAnims.current[i], {
        toValue: 1,
        duration: 500,
        delay: i * 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(translateAnims.current[i], {
        toValue: 0,
        duration: 500,
        delay: i * 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]);

    Animated.stagger(100, animations.flat()).start();
  }, [topTen.length]); // 🔥 re-create animations when article list size changes

  const styles = StyleSheet.create({
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
    return (
      <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
        <Text style={globalStyles.missingDataMessage1}>No stories found.</Text>
        <TooltipBubble
          message='No stories found. Tap "Fashion News" in the bottom navigation bar to got to the Fashion News screen add your favorite fashion news feeds.'
          position="top"
        />
      </View>
    );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{paddingRight: 8}}>
      {topTen.map((a, index) => {
        const fade = fadeAnims.current[index] || new Animated.Value(1);
        const translate =
          translateAnims.current[index] || new Animated.Value(0);

        return (
          <Animated.View
            key={String(a.id)}
            style={{
              opacity: fade,
              transform: [{translateY: translate}],
            }}>
            <Pressable
              style={globalStyles.outfitCard3}
              onPress={() => {
                if (a.link) {
                  if (onOpenArticle) onOpenArticle(a.link, a.title);
                  else Linking.openURL(a.link);
                }
              }}>
              {a.image ? (
                <Image
                  source={{uri: a.image}}
                  style={globalStyles.image5}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={{color: theme.colors.foreground3, fontSize: 12}}>
                    No image
                  </Text>
                </View>
              )}
              <Text
                style={[
                  globalStyles.cardLabel,
                  {
                    marginHorizontal: 10,
                    marginTop: 6,
                  },
                ]}
                numberOfLines={1}>
                {a.title || 'Untitled'}
              </Text>
              <Text
                style={[
                  globalStyles.cardSubLabel,
                  {
                    marginHorizontal: 10,
                    marginBottom: 8,
                    marginTop: 4,
                  },
                ]}
                numberOfLines={1}>
                {a.source || 'Fashion News'}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
};

export default NewsCarousel;

//////////////////////

// import React, {useMemo, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   Linking,
//   StyleSheet,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useUUID} from '../../context/UUIDContext';
// import {useFeedSources} from '../../hooks/useFeedSources';
// import {useFashionFeeds} from '../../hooks/useFashionFeeds';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
// import {TooltipBubble} from '../../components/ToolTip/ToolTip1';

// type Article = {
//   id: string | number;
//   title: string;
//   source: string;
//   image?: string | null;
//   link: string;
//   publishedAt?: string;
// };

// type NewsCarouselProps = {
//   onOpenArticle?: (url: string, title?: string) => void;
// };

// const NewsCarousel: React.FC<NewsCarouselProps> = ({onOpenArticle}) => {
//   const userId = useUUID() ?? '';
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const {sources, enabled} = useFeedSources({userId});
//   const activeFeeds = useMemo(
//     () =>
//       (enabled?.length ? enabled : sources).map(fs => ({
//         name: fs.name,
//         url: fs.url,
//       })),
//     [enabled, sources],
//   );

//   const {articles, loading, error} = useFashionFeeds(activeFeeds, {userId});

//   const topTen: Article[] = useMemo(() => {
//     const list = Array.isArray(articles) ? articles : [];
//     return [...list]
//       .sort((a, b) => {
//         const ta = a?.publishedAt ? Date.parse(a.publishedAt) : 0;
//         const tb = b?.publishedAt ? Date.parse(b.publishedAt) : 0;
//         return tb - ta;
//       })
//       .slice(0, 10);
//   }, [articles]);

//   // ✅ Store animations in a ref, but reset if article count changes
//   const fadeAnims = useRef<Animated.Value[]>([]);
//   const translateAnims = useRef<Animated.Value[]>([]);

//   useEffect(() => {
//     fadeAnims.current = topTen.map(() => new Animated.Value(0));
//     translateAnims.current = topTen.map(() => new Animated.Value(20));

//     const animations = topTen.map((_, i) => [
//       Animated.timing(fadeAnims.current[i], {
//         toValue: 1,
//         duration: 500,
//         delay: i * 100,
//         useNativeDriver: true,
//         easing: Easing.out(Easing.ease),
//       }),
//       Animated.timing(translateAnims.current[i], {
//         toValue: 0,
//         duration: 500,
//         delay: i * 100,
//         useNativeDriver: true,
//         easing: Easing.out(Easing.ease),
//       }),
//     ]);

//     Animated.stagger(100, animations.flat()).start();
//   }, [topTen.length]); // 🔥 re-create animations when article list size changes

//   const styles = StyleSheet.create({
//     card: {
//       width: 220,
//       marginRight: 12,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: theme.colors.surface2,
//       overflow: 'hidden',
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
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
//     return (
//       <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//         <Text style={globalStyles.missingDataMessage1}>No stories found.</Text>
//         <TooltipBubble
//           message='No stories found. Tap "Fashion News" in the bottom navigation bar to got to the Fashion News screen add your favorite fashion news feeds.'
//           position="top"
//         />
//       </View>
//     );

//   return (
//     <ScrollView
//       horizontal
//       showsHorizontalScrollIndicator={false}
//       contentContainerStyle={{paddingRight: 8}}>
//       {topTen.map((a, index) => {
//         const fade = fadeAnims.current[index] || new Animated.Value(1);
//         const translate =
//           translateAnims.current[index] || new Animated.Value(0);

//         return (
//           <Animated.View
//             key={String(a.id)}
//             style={{
//               opacity: fade,
//               transform: [{translateY: translate}],
//             }}>
//             <AppleTouchFeedback
//               style={styles.card}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 if (a.link) {
//                   if (onOpenArticle) onOpenArticle(a.link, a.title);
//                   else Linking.openURL(a.link);
//                 }
//               }}>
//               {a.image ? (
//                 <Image
//                   source={{uri: a.image}}
//                   style={globalStyles.image5}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <View style={styles.placeholder}>
//                   <Text style={{color: theme.colors.foreground3, fontSize: 12}}>
//                     No image
//                   </Text>
//                 </View>
//               )}
//               <Text
//                 style={{
//                   color: theme.colors.foreground,
//                   fontSize: 14,
//                   fontWeight: '700',
//                   marginHorizontal: 10,
//                   marginTop: 8,
//                 }}
//                 numberOfLines={2}>
//                 {a.title || 'Untitled'}
//               </Text>
//               <Text
//                 style={{
//                   fontSize: 12,
//                   color: theme.colors.foreground2,
//                   marginHorizontal: 10,
//                   marginBottom: 10,
//                   marginTop: 4,
//                   fontWeight: '500',
//                 }}
//                 numberOfLines={1}>
//                 {a.source || 'Fashion News'}
//               </Text>
//             </AppleTouchFeedback>
//           </Animated.View>
//         );
//       })}
//     </ScrollView>
//   );
// };

// export default NewsCarousel;

////////////////

// import React, {useMemo} from 'react';
// import {View, Text, Image, ScrollView, Linking, StyleSheet} from 'react-native';
// import {useUUID} from '../../context/UUIDContext';
// import {useFeedSources} from '../../hooks/useFeedSources';
// import {useFashionFeeds} from '../../hooks/useFashionFeeds';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

// type Article = {
//   id: string | number;
//   title: string;
//   source: string;
//   image?: string | null;
//   link: string;
//   publishedAt?: string;
// };

// type NewsCarouselProps = {
//   onOpenArticle?: (url: string, title?: string) => void;
// };

// const NewsCarousel: React.FC<NewsCarouselProps> = ({onOpenArticle}) => {
//   const userId = useUUID() ?? '';
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const {sources, enabled} = useFeedSources({userId});
//   const activeFeeds = (enabled?.length ? enabled : sources).map(fs => ({
//     name: fs.name,
//     url: fs.url,
//   }));

//   const {articles, loading, error} = useFashionFeeds(activeFeeds, {userId});

//   const topTen: Article[] = useMemo(() => {
//     const list = Array.isArray(articles) ? articles : [];
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
//       borderRadius: tokens.borderRadius.md,
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
//         <AppleTouchFeedback
//           key={String(a.id)}
//           style={styles.card}
//           hapticStyle="impactLight"
//           onPress={() => {
//             if (a.link) {
//               if (onOpenArticle) onOpenArticle(a.link, a.title);
//               else Linking.openURL(a.link);
//             }
//           }}>
//           {a.image ? (
//             <Image
//               source={{uri: a.image}}
//               style={globalStyles.image5}
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
//         </AppleTouchFeedback>
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
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

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
//         <AppleTouchFeedback
//           key={String(a.id)}
//           style={styles.card}
//           hapticStyle="impactLight"
//           onPress={() => a.link && Linking.openURL(a.link)}>
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
//         </AppleTouchFeedback>
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
