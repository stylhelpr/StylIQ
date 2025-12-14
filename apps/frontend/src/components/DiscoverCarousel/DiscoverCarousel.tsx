import React, {useEffect, useState, useRef, useCallback} from 'react';
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
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {isTablet, isLargePhone, isRegularPhone} from '../../styles/global';

// Card dimensions for auto-scroll calculation
const CARD_WIDTH = isTablet ? 160 : isLargePhone ? 180 : isRegularPhone ? 160 : 160;
const CARD_MARGIN = isTablet ? 16 : isLargePhone ? 10 : isRegularPhone ? 10 : 10;
const SCROLL_INTERVAL = CARD_WIDTH + CARD_MARGIN;
const AUTO_SCROLL_DELAY = 10000; // 10 seconds

// Animated pressable with scale effect for images
const ScalePressable = ({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}>
      <Animated.View style={[style, {transform: [{scale: scaleAnim}]}]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
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

type DiscoverCarouselProps = {
  onOpenItem?: (url: string, title?: string) => void;
};

const DiscoverCarousel: React.FC<DiscoverCarouselProps> = ({onOpenItem}) => {
  const userId = useUUID();
  const [ready, setReady] = useState(false);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const fadeAnims = useRef<Animated.Value[]>([]);
  const translateAnims = useRef<Animated.Value[]>([]);

  // Auto-scroll refs
  const scrollViewRef = useRef<ScrollView>(null);
  const currentIndexRef = useRef(0);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUserScrollingRef = useRef(false);

  // Auto-scroll effect - scrolls every 10 seconds
  useEffect(() => {
    if (recommended.length <= 1) return;

    const startAutoScroll = () => {
      autoScrollTimerRef.current = setInterval(() => {
        if (isUserScrollingRef.current) return;

        currentIndexRef.current =
          (currentIndexRef.current + 1) % recommended.length;
        const scrollX = currentIndexRef.current * SCROLL_INTERVAL;

        scrollViewRef.current?.scrollTo({
          x: scrollX,
          animated: true,
        });
      }, AUTO_SCROLL_DELAY);
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [recommended.length]);

  // Handle scroll events to sync current index and pause auto-scroll during user interaction
  const handleScrollBeginDrag = useCallback(() => {
    isUserScrollingRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    // Resume auto-scroll after a short delay
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 2000);
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      currentIndexRef.current = Math.round(offsetX / SCROLL_INTERVAL);
    },
    [],
  );

  const styles = StyleSheet.create({
    image: {
      width: '100%',
      height: 120,
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.surfaceBorder,
      borderBottomWidth: tokens.borderWidth.md,
    },
  });

  // ⏱️ Initial delay for mount
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  // 📡 Fetch data
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

  // 🎬 Trigger animations whenever list changes
  useEffect(() => {
    fadeAnims.current = recommended.map(() => new Animated.Value(0));
    translateAnims.current = recommended.map(() => new Animated.Value(20));

    const anims = recommended.map((_, i) =>
      Animated.parallel([
        Animated.timing(fadeAnims.current[i], {
          toValue: 1,
          duration: 450,
          delay: i * 120,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateAnims.current[i], {
          toValue: 0,
          duration: 450,
          delay: i * 120,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.stagger(100, anims).start();

    return () => {
      fadeAnims.current.forEach(anim => anim?.stopAnimation?.());
      translateAnims.current.forEach(anim => anim?.stopAnimation?.());
    };
  }, [recommended.length]);

  // 🪛 Loading & error states
  if (!ready || loading) return <Text style={{padding: 16}}>Loading…</Text>;
  if (error && recommended.length === 0)
    return <Text style={{padding: 16}}>{error}</Text>;

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      scrollEventThrottle={16}>
      {recommended.length === 0 ? (
        <Text style={{padding: 16, color: theme.colors.foreground2}}>
          No picks found
        </Text>
      ) : (
        recommended.map((item, i) => (
          <Animated.View
            key={item.id}
            style={{
              opacity: fadeAnims.current[i] || new Animated.Value(1),
              transform: [
                {
                  translateY:
                    translateAnims.current[i] || new Animated.Value(0),
                },
              ],
            }}>
            <ScalePressable
              style={globalStyles.outfitCard2}
              onPress={() => {
                if (onOpenItem) {
                  onOpenItem(item.link, item.title);
                } else {
                  Linking.openURL(item.link || '#');
                }
              }}>
              <Image
                source={{uri: item.image_url}}
                style={globalStyles.image7}
                resizeMode="cover"
                onError={() => console.warn('⚠️ image failed', item.image_url)}
              />
              <Text
                style={[
                  globalStyles.cardLabel,
                  {
                    marginHorizontal: 10,
                    marginTop: 6,
                  },
                ]}
                numberOfLines={1}>
                {item.title || 'Untitled'}
              </Text>
              <Text
                style={[
                  globalStyles.cardSubLabel,
                  {
                    marginHorizontal: 10,
                    marginBottom: 8,
                    marginTop: 4,
                  },
                ]}>
                {item.brand || 'Brand'}
              </Text>
            </ScalePressable>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
};

export default DiscoverCarousel;

////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   Linking,
//   StyleSheet,
//   Animated,
//   Easing,
//   Pressable,
// } from 'react-native';
// import {API_BASE_URL} from '../../config/api';
// import {useUUID} from '../../context/UUIDContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

// type Product = {
//   id: string;
//   title: string;
//   brand: string;
//   image_url: string;
//   link: string;
//   category: string;
// };

// type DiscoverCarouselProps = {
//   onOpenItem?: (url: string, title?: string) => void;
// };

// const DiscoverCarousel: React.FC<DiscoverCarouselProps> = ({onOpenItem}) => {
//   const userId = useUUID();
//   const [ready, setReady] = useState(false);
//   const [recommended, setRecommended] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const fadeAnims = useRef<Animated.Value[]>([]);
//   const translateAnims = useRef<Animated.Value[]>([]);

//   const styles = StyleSheet.create({
//     image: {
//       width: '100%',
//       height: 120,
//       backgroundColor: theme.colors.surface,
//       borderBottomColor: theme.colors.surfaceBorder,
//       borderBottomWidth: tokens.borderWidth.md,
//     },
//   });

//   // ⏱️ Initial delay for mount
//   useEffect(() => {
//     const t = setTimeout(() => setReady(true), 300);
//     return () => clearTimeout(t);
//   }, []);

//   // 📡 Fetch data
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

//   // 🎬 Trigger animations whenever list changes
//   useEffect(() => {
//     fadeAnims.current = recommended.map(() => new Animated.Value(0));
//     translateAnims.current = recommended.map(() => new Animated.Value(20));

//     const anims = recommended.map((_, i) =>
//       Animated.parallel([
//         Animated.timing(fadeAnims.current[i], {
//           toValue: 1,
//           duration: 450,
//           delay: i * 120,
//           easing: Easing.out(Easing.ease),
//           useNativeDriver: true,
//         }),
//         Animated.timing(translateAnims.current[i], {
//           toValue: 0,
//           duration: 450,
//           delay: i * 120,
//           easing: Easing.out(Easing.ease),
//           useNativeDriver: true,
//         }),
//       ]),
//     );

//     Animated.stagger(100, anims).start();

//     return () => {
//       fadeAnims.current.forEach(anim => anim?.stopAnimation?.());
//       translateAnims.current.forEach(anim => anim?.stopAnimation?.());
//     };
//   }, [recommended.length]);

//   // 🪛 Loading & error states
//   if (!ready || loading) return <Text style={{padding: 16}}>Loading…</Text>;
//   if (error && recommended.length === 0)
//     return <Text style={{padding: 16}}>{error}</Text>;

//   return (
//     <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//       {recommended.length === 0 ? (
//         <Text style={{padding: 16, color: theme.colors.foreground2}}>
//           No picks found
//         </Text>
//       ) : (
//         recommended.map((item, i) => (
//           <Animated.View
//             key={item.id}
//             style={{
//               opacity: fadeAnims.current[i] || new Animated.Value(1),
//               transform: [
//                 {
//                   translateY:
//                     translateAnims.current[i] || new Animated.Value(0),
//                 },
//               ],
//             }}>
//             <Pressable
//               style={globalStyles.outfitCard2}
//               onPress={() => {
//                 if (onOpenItem) {
//                   onOpenItem(item.link, item.title);
//                 } else {
//                   Linking.openURL(item.link || '#');
//                 }
//               }}>
//               <Image
//                 source={{uri: item.image_url}}
//                 style={globalStyles.image7}
//                 resizeMode="cover"
//                 onError={() => console.warn('⚠️ image failed', item.image_url)}
//               />
//               <Text
//                 style={[
//                   globalStyles.cardLabel,
//                   {
//                     color: theme.colors.foreground,
//                     marginHorizontal: 10,
//                     marginTop: 6,
//                   },
//                 ]}
//                 numberOfLines={1}>
//                 {item.title || 'Untitled'}
//               </Text>
//               <Text
//                 style={[
//                   globalStyles.cardSubLabel,
//                   {
//                     color: theme.colors.foreground2,
//                     marginHorizontal: 10,
//                     marginBottom: 8,
//                     marginTop: 4,
//                   },
//                 ]}>
//                 {item.brand || 'Brand'}
//               </Text>
//             </Pressable>
//           </Animated.View>
//         ))
//       )}
//     </ScrollView>
//   );
// };

// export default DiscoverCarousel;

/////////////////////

// import React, {useEffect, useState, useRef} from 'react';
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
// import {API_BASE_URL} from '../../config/api';
// import {useUUID} from '../../context/UUIDContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

// type Product = {
//   id: string;
//   title: string;
//   brand: string;
//   image_url: string;
//   link: string;
//   category: string;
// };

// type DiscoverCarouselProps = {
//   onOpenItem?: (url: string, title?: string) => void;
// };

// const DiscoverCarousel: React.FC<DiscoverCarouselProps> = ({onOpenItem}) => {
//   const userId = useUUID();
//   const [ready, setReady] = useState(false);
//   const [recommended, setRecommended] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const fadeAnims = useRef<Animated.Value[]>([]);
//   const translateAnims = useRef<Animated.Value[]>([]);

//   const styles = StyleSheet.create({
//     card: {
//       width: 160,
//       marginRight: 12,
//       borderRadius: tokens.borderRadius.md,
//       // borderRadius: tokens.borderRadius['2xl'],
//       backgroundColor: theme.colors.surface2,
//       overflow: 'hidden',
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     image: {
//       width: '100%',
//       height: 120,
//       backgroundColor: theme.colors.surface,
//       borderBottomColor: theme.colors.surfaceBorder,
//       borderBottomWidth: tokens.borderWidth.md,
//     },
//   });

//   // ⏱️ Initial delay for mount
//   useEffect(() => {
//     const t = setTimeout(() => setReady(true), 300);
//     return () => clearTimeout(t);
//   }, []);

//   // 📡 Fetch data
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

//   // 🎬 Trigger animations whenever list changes
//   useEffect(() => {
//     fadeAnims.current = recommended.map(() => new Animated.Value(0));
//     translateAnims.current = recommended.map(() => new Animated.Value(20));

//     const anims = recommended.map((_, i) =>
//       Animated.parallel([
//         Animated.timing(fadeAnims.current[i], {
//           toValue: 1,
//           duration: 450,
//           delay: i * 120,
//           easing: Easing.out(Easing.ease),
//           useNativeDriver: true,
//         }),
//         Animated.timing(translateAnims.current[i], {
//           toValue: 0,
//           duration: 450,
//           delay: i * 120,
//           easing: Easing.out(Easing.ease),
//           useNativeDriver: true,
//         }),
//       ]),
//     );

//     Animated.stagger(100, anims).start();

//     return () => {
//       fadeAnims.current.forEach(anim => anim?.stopAnimation?.());
//       translateAnims.current.forEach(anim => anim?.stopAnimation?.());
//     };
//   }, [recommended.length]);

//   // 🪛 Loading & error states
//   if (!ready || loading) return <Text style={{padding: 16}}>Loading…</Text>;
//   if (error && recommended.length === 0)
//     return <Text style={{padding: 16}}>{error}</Text>;

//   return (
//     <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//       {recommended.length === 0 ? (
//         <Text style={{padding: 16, color: theme.colors.foreground2}}>
//           No picks found
//         </Text>
//       ) : (
//         recommended.map((item, i) => (
//           <Animated.View
//             key={item.id}
//             style={{
//               opacity: fadeAnims.current[i] || new Animated.Value(1),
//               transform: [
//                 {
//                   translateY:
//                     translateAnims.current[i] || new Animated.Value(0),
//                 },
//               ],
//             }}>
//             <AppleTouchFeedback
//               style={styles.card}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 if (onOpenItem) {
//                   onOpenItem(item.link, item.title);
//                 } else {
//                   Linking.openURL(item.link || '#');
//                 }
//               }}>
//               <Image
//                 source={{uri: item.image_url}}
//                 style={globalStyles.image5}
//                 resizeMode="cover"
//                 onError={() => console.warn('⚠️ image failed', item.image_url)}
//               />
//               <Text
//                 style={[
//                   globalStyles.cardLabel,
//                   {
//                     color: theme.colors.foreground,
//                     marginHorizontal: 10,
//                     marginTop: 6,
//                   },
//                 ]}
//                 numberOfLines={1}>
//                 {item.title || 'Untitled'}
//               </Text>
//               <Text
//                 style={[
//                   globalStyles.cardSubLabel,
//                   {
//                     color: theme.colors.foreground2,
//                     marginHorizontal: 10,
//                     marginBottom: 8,
//                     marginTop: 4,
//                   },
//                 ]}>
//                 {item.brand || 'Brand'}
//               </Text>
//             </AppleTouchFeedback>
//           </Animated.View>
//         ))
//       )}
//     </ScrollView>
//   );
// };

// export default DiscoverCarousel;

///////////////////////

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
// import {API_BASE_URL} from '../../config/api';
// import {useUUID} from '../../context/UUIDContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

// type Product = {
//   id: string;
//   title: string;
//   brand: string;
//   image_url: string;
//   link: string;
//   category: string;
// };

// type DiscoverCarouselProps = {
//   onOpenItem?: (url: string, title?: string) => void;
// };

// const DiscoverCarousel: React.FC<DiscoverCarouselProps> = ({onOpenItem}) => {
//   const userId = useUUID();
//   const [ready, setReady] = useState(false);
//   const [recommended, setRecommended] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     card: {
//       width: 160,
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
//       borderBottomColor: theme.colors.surfaceBorder,
//       borderBottomWidth: tokens.borderWidth.md,
//     },
//     title: {
//       color: theme.colors.foreground,
//       marginHorizontal: 10,
//       marginTop: 6,
//     },
//     brand: {
//       color: theme.colors.foreground2,
//       marginHorizontal: 10,
//       marginBottom: 8,
//       marginTop: 4,
//     },
//   });

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
//     <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//       {recommended.length === 0 ? (
//         <Text style={{padding: 16, color: theme.colors.foreground2}}>
//           No picks found
//         </Text>
//       ) : (
//         recommended.map(item => (
//           <AppleTouchFeedback
//             key={item.id}
//             style={styles.card}
//             hapticStyle="impactLight"
//             onPress={() => {
//               if (onOpenItem) {
//                 onOpenItem(item.link, item.title);
//               } else {
//                 Linking.openURL(item.link || '#');
//               }
//             }}>
//             <Image
//               source={{uri: item.image_url}}
//               style={globalStyles.image5}
//               resizeMode="cover"
//               onError={() => console.warn('⚠️ image failed', item.image_url)}
//             />
//             <Text
//               style={[
//                 globalStyles.cardLabel,
//                 {
//                   color: theme.colors.foreground,
//                   marginHorizontal: 10,
//                   marginTop: 6,
//                 },
//               ]}
//               numberOfLines={1}>
//               {item.title || 'Untitled'}
//             </Text>
//             <Text
//               style={[
//                 globalStyles.cardSubLabel,
//                 {
//                   color: theme.colors.foreground2,
//                   marginHorizontal: 10,
//                   marginBottom: 8,
//                   marginTop: 4,
//                 },
//               ]}>
//               {item.brand || 'Brand'}
//             </Text>
//           </AppleTouchFeedback>
//         ))
//       )}
//     </ScrollView>
//   );
// };

// export default DiscoverCarousel;

//////////////

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
// import {API_BASE_URL} from '../../config/api';
// import {useUUID} from '../../context/UUIDContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

// type Product = {
//   id: string;
//   title: string;
//   brand: string;
//   image_url: string;
//   link: string;
//   category: string;
// };

// const DiscoverCarousel: React.FC = () => {
//   const userId = useUUID();
//   const [ready, setReady] = useState(false);
//   const [recommended, setRecommended] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     card: {
//       width: 160,
//       marginRight: 12,
//       borderRadius: 20,
//       backgroundColor: theme.colors.surface2,
//       overflow: 'hidden',
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     image: {
//       width: '100%',
//       height: 120,
//       backgroundColor: theme.colors.surface,
//       borderBottomColor: theme.colors.surfaceBorder,
//       borderBottomWidth: tokens.borderWidth.md,
//     },
//     title: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '600',
//       marginHorizontal: 8,
//       marginTop: 6,
//     },
//     brand: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       marginHorizontal: 8,
//       marginBottom: 8,
//       marginTop: 4,
//       fontWeight: '500',
//     },
//   });

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
//     <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//       {recommended.length === 0 ? (
//         <Text style={{padding: 16, color: '#666'}}>No picks found</Text>
//       ) : (
//         recommended.map(item => (
//           <AppleTouchFeedback
//             key={item.id}
//             style={styles.card}
//             hapticStyle="impactLight"
//             onPress={() => Linking.openURL(item.link || '#')}>
//             <Image
//               source={{uri: item.image_url}}
//               style={styles.image}
//               resizeMode="cover"
//               onError={() => console.warn('⚠️ image failed', item.image_url)}
//             />
//             <Text style={styles.title} numberOfLines={1}>
//               {item.title || 'Untitled'}
//             </Text>
//             <Text style={styles.brand}>{item.brand || 'Brand'}</Text>
//           </AppleTouchFeedback>
//         ))
//       )}
//     </ScrollView>
//   );
// };

// export default DiscoverCarousel;

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
