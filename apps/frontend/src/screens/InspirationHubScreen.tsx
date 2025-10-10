/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import FrostedCard from '../components/FrostedCard/FrostedCard';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useAnalyzeLook} from '../hooks/useAnalyzeLook';
import {useRecreateLook} from '../hooks/useRecreateLook';
import {useUUID} from '../context/UUIDContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const {width} = Dimensions.get('window');
const CARD_SIZE = width / 2 - tokens.spacing.md * 1.5;

type SavedLook = {
  id: string;
  image: string;
  tags?: string[];
  created_at: number;
};

type Props = {
  navigate: (screen: string, params?: any) => void;
};

export default function InspirationHubScreen({navigate}: Props) {
  console.log('[Hub] Mount start');

  const {theme} = useAppTheme();
  const {centeredSection} = useGlobalStyles();
  const userId = useUUID();

  const {analyzeLook, loading: analyzing} = useAnalyzeLook();
  const {recreateLook, loading: recreating} = useRecreateLook();

  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [selectedLook, setSelectedLook] = useState<SavedLook | null>(null);

  console.log('[Hub] UUID:', userId);

  const modalBackdrop = 'rgba(0,0,0,0.4)';
  const surface2 = theme.colors.surface2 || 'rgba(255,255,255,0.08)';

  useEffect(() => {
    console.log('[Hub] useEffect → setSavedLooks');
    setSavedLooks([
      {
        id: '1',
        image:
          'https://storage.googleapis.com/stylhelpr-prod-bucket/uploads/2e/2e7b4297-72e4-4152-90bb-f00432c88ab7/images/e2fd128e-bb63-4ff0-b76f-8f83a21cad28-197D2845-8298-4F21-8414-7EDDA5EDE72C.png',
        tags: [],
        created_at: Date.now(),
      },
      {
        id: '2',
        // ✅ keep an Unsplash one to see fallback still works
        image:
          'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&w=800',
        tags: [],
        created_at: Date.now(),
      },
      {
        id: '3',
        image:
          'https://storage.googleapis.com/stylhelpr-prod-bucket/wardrobe/test-streetwear-look.jpg',
        tags: [],
        created_at: Date.now(),
      },
    ]);
  }, []);

  const openLook = async (look: SavedLook) => {
    console.log('[Hub] openLook →', look.id);
    setSelectedLook(look);

    if (!look.tags || look.tags.length === 0) {
      try {
        // 🔍 Log the exact image data before sending
        const publicUrl = look.image;

        const gsutilUri = look.image
          .replace('https://storage.googleapis.com/', 'gs://')
          .replace('storage.googleapis.com/', '');

        console.log('[Hub] analyzeLook → constructed data:', {
          publicUrl,
          gsutilUri,
        });

        // ✅ Send both forms — hook auto-prefers gs:// when valid
        const result = await analyzeLook({publicUrl, gsutilUri});

        console.log('[Hub] analyzeLook result (raw):', result);

        if (result?.tags?.length) {
          console.log('[Hub] analyzeLook → tags detected:', result.tags);
          setSavedLooks(prev =>
            prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
          );
          setSelectedLook({...look, tags: result.tags});
        } else {
          console.log('[Hub] analyzeLook → no tags found in response');
        }
      } catch (err) {
        console.error('[Hub] AI analyze failed:', err);
      }
    } else {
      console.log('[Hub] Skipping analyze (tags already exist):', look.tags);
    }
  };

  const closeLook = () => {
    console.log('[Hub] closeLook');
    setSelectedLook(null);
  };

  const handleRecreate = async () => {
    console.log('[Hub] handleRecreate tapped!', selectedLook);
    if (!selectedLook) {
      console.log('[Hub] ❌ No selectedLook');
      return;
    }

    ReactNativeHapticFeedback.trigger('impactMedium');

    try {
      console.log('[Hub] 🧩 Preparing recreate payload:', {
        user_id: userId,
        tags: selectedLook.tags,
        image_url: selectedLook.image,
      });
      // 🧠 Pass both the tags and actual image URL
      const data = await recreateLook({
        user_id: userId,
        tags: selectedLook.tags || ['casual', 'modern', 'neutral'],
        image_url: selectedLook.image, // 👈 crucial addition
      });

      console.log('[Hub] 🧥 Recreated Outfit:', data);

      const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

      // --- 🔥 Replace Unsplash helper with real merchandise fetch ---
      // --- 🔥 Replace Unsplash helper with real merchandise fetch ---
      async function getRealProduct(query: string) {
        try {
          const res = await fetch(
            `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
              query,
            )}&api_key=${process.env.RAPIDAPI_KEY}`,
          );
          const json = await res.json();
          const product = json.shopping_results?.[0];
          if (!product) throw new Error('no results');

          return {
            image: product.thumbnail,
            shopUrl: product.link,
            brand: product.source,
            price: product.extracted_price
              ? `$${product.extracted_price}`
              : product.price,
            name: product.title,
          };
        } catch (e) {
          console.warn('[Hub] getRealProduct fallback', e);
          return {
            image:
              'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
            shopUrl: null,
            brand: 'Unavailable',
            price: null,
            name: query,
          };
        }
      }

      // 🧠 Use backend results directly — no second fetch
      const mapped = {
        owned: (data.outfit || []).map((o: any, i: number) => ({
          id: `${i}`,
          color: o.color,
          name: o.item,
          brand: o.brand || 'AI Styled',
          price: o.price || null,
          image: o.image?.startsWith('http')
            ? o.image
            : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
          shopUrl: o.shopUrl || null,
        })),
        recommendations: (data.recommendations || []).map(
          (r: any, i: number) => ({
            id: `rec-${i}`,
            color: r.color,
            name: r.item,
            brand: r.brand || 'Suggested',
            price: r.price || null,
            image: r.image?.startsWith('http')
              ? r.image
              : 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
            shopUrl: r.shopUrl || null,
          }),
        ),
      };

      console.log('[Hub] 🪄 Mapped data for RecreatedLook:', mapped);

      closeLook();
      navigate('RecreatedLook', {data: mapped});
    } catch (err) {
      console.error('[Hub] Recreate failed:', err);
      closeLook();
    }
  };

  try {
    console.log('[Hub] Render start');
    return (
      <View style={{flex: 1, backgroundColor: theme.colors.background}}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            centeredSection,
            {paddingTop: tokens.spacing.xl, paddingBottom: 120},
          ]}>
          {console.log('[Hub] Rendering ScrollView content')}

          {/* Header */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: theme.colors.foreground,
              marginBottom: tokens.spacing.sm,
            }}>
            Inspiration Hub
          </Text>
          <Text
            style={{
              color: theme.colors.foreground,
              marginBottom: tokens.spacing.lg,
              fontSize: 16,
            }}>
            Your saved outfit ideas — tap any look to explore or recreate.
          </Text>

          {/* Grid */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
            }}>
            {savedLooks.map((item, index) => (
              <Animatable.View
                key={item.id}
                animation="fadeInUp"
                delay={index * 80}
                duration={400}
                style={{
                  width: CARD_SIZE,
                  height: CARD_SIZE * 1.3,
                  borderRadius: tokens.borderRadius.lg,
                  overflow: 'hidden',
                  backgroundColor:
                    theme.colors.surface || 'rgba(255,255,255,0.08)',
                  marginRight: index % 2 === 0 ? tokens.spacing.md : 0,
                  marginBottom: tokens.spacing.md,
                }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => openLook(item)}>
                  <Image
                    source={{uri: item.image}}
                    style={{width: '100%', height: '100%'}}
                    resizeMode="cover"
                  />
                  {analyzing && selectedLook?.id === item.id && (
                    <View
                      style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                      <ActivityIndicator color="#fff" size="large" />
                    </View>
                  )}
                </TouchableOpacity>
              </Animatable.View>
            ))}
          </View>
        </ScrollView>

        {/* Modal */}
        <Modal visible={!!selectedLook} animationType="fade" transparent>
          {selectedLook && (
            <View
              pointerEvents="box-none"
              style={{
                flex: 1,
                backgroundColor: modalBackdrop,
                justifyContent: 'center',
                alignItems: 'center',
                padding: tokens.spacing.lg,
              }}>
              {console.log('[Hub] Rendering modal for look', selectedLook.id)}
              <Animatable.View
                animation="fadeInUp"
                duration={300}
                style={{
                  width: '100%',
                  maxWidth: 420,
                  borderRadius: tokens.borderRadius['2xl'],
                  overflow: 'hidden',
                  backgroundColor: theme.colors.surface,
                }}>
                <Image
                  source={{uri: selectedLook.image}}
                  style={{width: '100%', height: 500}}
                  resizeMode="cover"
                />

                <View style={{padding: tokens.spacing.md}}>
                  <Text
                    style={{
                      color: theme.colors.foreground,
                      fontSize: 20,
                      fontWeight: '600',
                      marginBottom: 6,
                    }}>
                    Recreate This Look
                  </Text>

                  {/* Tags */}
                  {selectedLook.tags && selectedLook.tags.length > 0 ? (
                    <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                      {selectedLook.tags.map((t, i) => (
                        <View
                          key={`${t}-${i}`} // ✅ unique even if duplicate values
                          style={{
                            backgroundColor: surface2,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                            marginRight: 6,
                            marginBottom: 6,
                          }}>
                          <Text style={{color: theme.colors.foreground}}>
                            #{t}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text
                      style={{
                        color: theme.colors.foreground,
                        fontSize: 14,
                        marginTop: 4,
                      }}>
                      AI is analyzing this look...
                    </Text>
                  )}

                  {/* Build Look button */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      console.log('[Hub] Touchable pressed');
                      handleRecreate();
                    }}
                    style={{
                      marginTop: tokens.spacing.md,
                      backgroundColor: theme.colors.primary,
                      paddingVertical: 14,
                      borderRadius: tokens.borderRadius.xl,
                      alignItems: 'center',
                      opacity: recreating ? 0.7 : 1,
                    }}
                    disabled={recreating}>
                    {recreating ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text
                        style={{
                          color: 'white',
                          fontWeight: '600',
                          fontSize: 16,
                        }}>
                        Build This Look
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <AppleTouchFeedback onPress={closeLook}>
                  <View
                    style={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      borderRadius: 30,
                      padding: 6,
                    }}>
                    <MaterialIcons name="close" size={26} color="white" />
                  </View>
                </AppleTouchFeedback>
              </Animatable.View>
            </View>
          )}
        </Modal>
      </View>
    );
  } catch (err: any) {
    console.error('[Hub] 💥 Render error:', err);
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: '#000',
        }}>
        <Text style={{color: 'red', fontSize: 16}}>
          Render error: {String(err.message || err)}
        </Text>
      </View>
    );
  }
}

/////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
//   Dimensions,
//   ActivityIndicator,
//   StyleSheet,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAnalyzeLook} from '../hooks/useAnalyzeLook';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {useUUID} from '../context/UUIDContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {width} = Dimensions.get('window');
// const CARD_SIZE = width / 2 - tokens.spacing.md * 1.5;

// type SavedLook = {
//   id: string;
//   image: string;
//   tags?: string[];
//   created_at: number;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// export default function InspirationHubScreen({navigate}: Props) {
//   console.log('[Hub] Mount start');

//   const {theme} = useAppTheme();
//   const {centeredSection} = useGlobalStyles();
//   const userId = useUUID();

//   const {analyzeLook, loading: analyzing} = useAnalyzeLook();
//   const {recreateLook, loading: recreating} = useRecreateLook();

//   const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
//   const [selectedLook, setSelectedLook] = useState<SavedLook | null>(null);

//   console.log('[Hub] UUID:', userId);

//   const modalBackdrop = 'rgba(0,0,0,0.4)';
//   const surface2 = theme.colors.surface2 || 'rgba(255,255,255,0.08)';

//   //   useEffect(() => {
//   //     console.log('[Hub] useEffect → setSavedLooks');
//   //     setSavedLooks([
//   //       {
//   //         id: '1',
//   //         image:
//   //           'https://images.unsplash.com/photo-1602810318383-4e6c78f90e0d?auto=format&w=800',
//   //         tags: [],
//   //         created_at: Date.now(),
//   //       },
//   //       {
//   //         id: '2',
//   //         image:
//   //           'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&w=800',
//   //         tags: [],
//   //         created_at: Date.now(),
//   //       },
//   //       {
//   //         id: '3',
//   //         image:
//   //           'https://images.unsplash.com/photo-1551854838-212c50b4c7c7?auto=format&w=800',
//   //         tags: [],
//   //         created_at: Date.now(),
//   //       },
//   //     ]);
//   //   }, []);

//   useEffect(() => {
//     console.log('[Hub] useEffect → setSavedLooks');
//     setSavedLooks([
//       {
//         id: '1',
//         image:
//           'https://storage.googleapis.com/stylhelpr-prod-bucket/uploads/2e/2e7b4297-72e4-4152-90bb-f00432c88ab7/images/e2fd128e-bb63-4ff0-b76f-8f83a21cad28-197D2845-8298-4F21-8414-7EDDA5EDE72C.png',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '2',
//         // ✅ keep an Unsplash one to see fallback still works
//         image:
//           'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '3',
//         image:
//           'https://storage.googleapis.com/stylhelpr-prod-bucket/wardrobe/test-streetwear-look.jpg',
//         tags: [],
//         created_at: Date.now(),
//       },
//     ]);
//   }, []);

//   //   const openLook = async (look: SavedLook) => {
//   //     console.log('[Hub] openLook →', look.id);
//   //     setSelectedLook(look);
//   //     if (!look.tags || look.tags.length === 0) {
//   //       try {
//   //         const result = await analyzeLook(look.image);
//   //         console.log('[Hub] analyzeLook result:', result);
//   //         if (result?.tags?.length) {
//   //           setSavedLooks(prev =>
//   //             prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
//   //           );
//   //           setSelectedLook({...look, tags: result.tags});
//   //         }
//   //       } catch (err) {
//   //         console.error('[Hub] AI analyze failed:', err);
//   //       }
//   //     }
//   //   };

//   const openLook = async (look: SavedLook) => {
//     console.log('[Hub] openLook →', look.id);
//     setSelectedLook(look);

//     if (!look.tags || look.tags.length === 0) {
//       try {
//         // 🔍 Log the exact image data before sending
//         const publicUrl = look.image;

//         const gsutilUri = look.image
//           .replace('https://storage.googleapis.com/', 'gs://')
//           .replace('storage.googleapis.com/', '');

//         console.log('[Hub] analyzeLook → constructed data:', {
//           publicUrl,
//           gsutilUri,
//         });

//         // ✅ Send both forms — hook auto-prefers gs:// when valid
//         const result = await analyzeLook({publicUrl, gsutilUri});

//         console.log('[Hub] analyzeLook result (raw):', result);

//         if (result?.tags?.length) {
//           console.log('[Hub] analyzeLook → tags detected:', result.tags);
//           setSavedLooks(prev =>
//             prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
//           );
//           setSelectedLook({...look, tags: result.tags});
//         } else {
//           console.log('[Hub] analyzeLook → no tags found in response');
//         }
//       } catch (err) {
//         console.error('[Hub] AI analyze failed:', err);
//       }
//     } else {
//       console.log('[Hub] Skipping analyze (tags already exist):', look.tags);
//     }
//   };

//   const closeLook = () => {
//     console.log('[Hub] closeLook');
//     setSelectedLook(null);
//   };

//   //   const handleRecreate = async () => {
//   //     console.log('[Hub] handleRecreate tapped!', selectedLook);
//   //     if (!selectedLook) {
//   //       console.log('[Hub] ❌ No selectedLook');
//   //       return;
//   //     }

//   //     ReactNativeHapticFeedback.trigger('impactMedium');

//   //     try {
//   //       const data = await recreateLook({
//   //         user_id: userId,
//   //         tags: selectedLook.tags || ['casual', 'modern', 'neutral'],
//   //       });

//   //       console.log('[Hub] 🧥 Recreated Outfit:', data);

//   //       // ✅ Convert OpenAI response into owned/recommendations structure
//   //       const mapped = {
//   //         owned: Array.isArray(data.outfit)
//   //           ? data.outfit.map((o: any, i: number) => ({
//   //               id: `${i}`,
//   //               name: o.item,
//   //               color: o.color,
//   //               brand: 'AI Styled',
//   //               image:
//   //                 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//   //             }))
//   //           : [],
//   //         recommendations: [],
//   //       };

//   //       console.log('[Hub] 🪄 Mapped data for RecreatedLook:', mapped);

//   //       closeLook();
//   //       navigate('RecreatedLook', {data: mapped});
//   //     } catch (err) {
//   //       console.error('[Hub] Recreate failed:', err);
//   //       closeLook();
//   //     }
//   //   };

//   const handleRecreate = async () => {
//     console.log('[Hub] handleRecreate tapped!', selectedLook);
//     if (!selectedLook) {
//       console.log('[Hub] ❌ No selectedLook');
//       return;
//     }

//     ReactNativeHapticFeedback.trigger('impactMedium');

//     try {
//       console.log('[Hub] 🧩 Preparing recreate payload:', {
//         user_id: userId,
//         tags: selectedLook.tags,
//         image_url: selectedLook.image,
//       });
//       // 🧠 Pass both the tags and actual image URL
//       const data = await recreateLook({
//         user_id: userId,
//         tags: selectedLook.tags || ['casual', 'modern', 'neutral'],
//         image_url: selectedLook.image, // 👈 crucial addition
//       });

//       console.log('[Hub] 🧥 Recreated Outfit:', data);

//       //   const mapped = {
//       //     owned: Array.isArray(data.outfit)
//       //       ? data.outfit.map((o: any, i: number) => ({
//       //           id: `${i}`,
//       //           name: o.item,
//       //           color: o.color,
//       //           brand: o.brand || 'AI Styled',
//       //           // 👇 now show the same look as a visual base reference
//       //           image: selectedLook.image,
//       //           shopUrl: o.shop_url || null,
//       //         }))
//       //       : [],
//       //     recommendations:
//       //       Array.isArray(data.recommendations) &&
//       //       data.recommendations.map((r: any, i: number) => ({
//       //         id: `rec-${i}`,
//       //         name: r.item,
//       //         color: r.color,
//       //         brand: r.brand || 'Suggested',
//       //         image: r.image || selectedLook.image,
//       //         shopUrl: r.shop_url || null,
//       //       })),
//       //   };

//       //   const mapped = {
//       //     owned: Array.isArray(data.outfit)
//       //       ? data.outfit.map((o: any, i: number) => {
//       //           const query = `${(o.item || o.category || 'fashion')
//       //             .replace(/[^a-zA-Z0-9 ]/g, '')
//       //             .trim()
//       //             .split(' ')
//       //             .join('-')}-${o.color || ''}`;

//       //           return {
//       //             id: `${i}`,
//       //             name: o.item,
//       //             color: o.color,
//       //             brand: o.brand || 'AI Styled',
//       //             // ✅ Direct Unsplash CDN image that works in RN (no redirects)
//       //             image: `https://images.unsplash.com/photo-${
//       //               1000 + i
//       //             }?crop=entropy&cs=tinysrgb&fit=crop&w=600&h=800&q=80&ixid=${encodeURIComponent(
//       //               query,
//       //             )}`,
//       //             shopUrl: o.shop_url || null,
//       //           };
//       //         })
//       //       : [],
//       //     recommendations:
//       //       Array.isArray(data.recommendations) &&
//       //       data.recommendations.map((r: any, i: number) => {
//       //         const query = `${(r.item || r.category || 'style')
//       //           .replace(/[^a-zA-Z0-9 ]/g, '')
//       //           .trim()
//       //           .split(' ')
//       //           .join('-')}-${r.color || ''}`;

//       //         return {
//       //           id: `rec-${i}`,
//       //           name: r.item,
//       //           color: r.color,
//       //           brand: r.brand || 'Suggested',
//       //           image: `https://images.unsplash.com/photo-${
//       //             1100 + i
//       //           }?crop=entropy&cs=tinysrgb&fit=crop&w=600&h=800&q=80&ixid=${encodeURIComponent(
//       //             query,
//       //           )}`,
//       //           shopUrl: r.shop_url || null,
//       //         };
//       //       }),
//       //   };

//       //   const unsplashFallbacks = [
//       //     // ✅ use real existing Unsplash photo IDs (safe and free)
//       //     '1666976176362-8df8659293ab', // beige overshirt
//       //     '1503341455253-b2e723bb3dbb', // grey tee
//       //     '1526170375885-4d8ecf77b99f', // ripped jeans
//       //     '1503342217505-b0a15ec3261c', // white sneakers
//       //   ];

//       //   const mapped = {
//       //     owned: Array.isArray(data.outfit)
//       //       ? data.outfit.map((o: any, i: number) => ({
//       //           id: `${i}`,
//       //           name: o.item,
//       //           color: o.color,
//       //           brand: o.brand || 'AI Styled',
//       //           image: `https://images.unsplash.com/photo-${
//       //             unsplashFallbacks[i % unsplashFallbacks.length]
//       //           }?auto=format&fit=crop&w=800&h=1000&q=80`,
//       //           shopUrl: o.shop_url || null,
//       //         }))
//       //       : [],
//       //     recommendations:
//       //       Array.isArray(data.recommendations) &&
//       //       data.recommendations.map((r: any, i: number) => ({
//       //         id: `rec-${i}`,
//       //         name: r.item,
//       //         color: r.color,
//       //         brand: r.brand || 'Suggested',
//       //         image: `https://images.unsplash.com/photo-${
//       //           unsplashFallbacks[i % unsplashFallbacks.length]
//       //         }?auto=format&fit=crop&w=800&h=1000&q=80`,
//       //         shopUrl: r.shop_url || null,
//       //       })),
//       //   };

//       const SERPAPI_KEY = process.env.SERPAPI_KEY;

//       // --- 🔥 Replace Unsplash helper with real merchandise fetch ---
//       async function getRealProduct(query: string) {
//         try {
//           const res = await fetch(
//             `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
//               query,
//             )}&api_key=${process.env.SERPAPI_KEY}`,
//           );
//           const json = await res.json();
//           const product = json.shopping_results?.[0];
//           if (!product) throw new Error('no results');

//           return {
//             image: product.thumbnail,
//             shopUrl: product.link,
//             brand: product.source,
//             price: product.extracted_price
//               ? `$${product.extracted_price}`
//               : product.price,
//             name: product.title,
//           };
//         } catch (e) {
//           console.warn('[Hub] getRealProduct fallback', e);
//           return {
//             image:
//               'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//             shopUrl: null,
//             brand: 'Unavailable',
//             price: null,
//             name: query,
//           };
//         }
//       }

//       // inside handleRecreate → after const data = await recreateLook(...);
//       const mapped = {
//         owned: await Promise.all(
//           (data.outfit || []).map(async (o: any, i: number) => {
//             const query = `${o.color || ''} ${o.item || o.category}`.trim();
//             const product = await getRealProduct(query);
//             return {
//               id: `${i}`,
//               color: o.color,
//               name: product.name || o.item,
//               brand: product.brand || o.brand || 'AI Styled',
//               price: product.price || null,
//               image: product.image,
//               shopUrl: product.shopUrl,
//             };
//           }),
//         ),
//         recommendations: await Promise.all(
//           (data.recommendations || []).map(async (r: any, i: number) => {
//             const query = `${r.color || ''} ${r.item || r.category}`.trim();
//             const product = await getRealProduct(query);
//             return {
//               id: `rec-${i}`,
//               color: r.color,
//               name: product.name || r.item,
//               brand: product.brand || r.brand || 'Suggested',
//               price: product.price || null,
//               image: product.image,
//               shopUrl: product.shopUrl,
//             };
//           }),
//         ),
//       };

//       console.log('[Hub] 🪄 Mapped data for RecreatedLook:', mapped);

//       closeLook();
//       navigate('RecreatedLook', {data: mapped});
//     } catch (err) {
//       console.error('[Hub] Recreate failed:', err);
//       closeLook();
//     }
//   };

//   try {
//     console.log('[Hub] Render start');
//     return (
//       <View style={{flex: 1, backgroundColor: theme.colors.background}}>
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={[
//             centeredSection,
//             {paddingTop: tokens.spacing.xl, paddingBottom: 120},
//           ]}>
//           {console.log('[Hub] Rendering ScrollView content')}

//           {/* Header */}
//           <Text
//             style={{
//               fontSize: 28,
//               fontWeight: '700',
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.sm,
//             }}>
//             Inspiration Hub
//           </Text>
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.lg,
//               fontSize: 16,
//             }}>
//             Your saved outfit ideas — tap any look to explore or recreate.
//           </Text>

//           {/* Grid */}
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               justifyContent: 'flex-start',
//             }}>
//             {savedLooks.map((item, index) => (
//               <Animatable.View
//                 key={item.id}
//                 animation="fadeInUp"
//                 delay={index * 80}
//                 duration={400}
//                 style={{
//                   width: CARD_SIZE,
//                   height: CARD_SIZE * 1.3,
//                   borderRadius: tokens.borderRadius.lg,
//                   overflow: 'hidden',
//                   backgroundColor:
//                     theme.colors.surface || 'rgba(255,255,255,0.08)',
//                   marginRight: index % 2 === 0 ? tokens.spacing.md : 0,
//                   marginBottom: tokens.spacing.md,
//                 }}>
//                 <TouchableOpacity
//                   activeOpacity={0.8}
//                   onPress={() => openLook(item)}>
//                   <Image
//                     source={{uri: item.image}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                   {analyzing && selectedLook?.id === item.id && (
//                     <View
//                       style={{
//                         ...StyleSheet.absoluteFillObject,
//                         backgroundColor: 'rgba(0,0,0,0.3)',
//                         justifyContent: 'center',
//                         alignItems: 'center',
//                       }}>
//                       <ActivityIndicator color="#fff" size="large" />
//                     </View>
//                   )}
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </ScrollView>

//         {/* Modal */}
//         <Modal visible={!!selectedLook} animationType="fade" transparent>
//           {selectedLook && (
//             <View
//               pointerEvents="box-none"
//               style={{
//                 flex: 1,
//                 backgroundColor: modalBackdrop,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 padding: tokens.spacing.lg,
//               }}>
//               {console.log('[Hub] Rendering modal for look', selectedLook.id)}
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   width: '100%',
//                   maxWidth: 420,
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 <Image
//                   source={{uri: selectedLook.image}}
//                   style={{width: '100%', height: 500}}
//                   resizeMode="cover"
//                 />

//                 <View style={{padding: tokens.spacing.md}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 20,
//                       fontWeight: '600',
//                       marginBottom: 6,
//                     }}>
//                     Recreate This Look
//                   </Text>

//                   {/* Tags */}
//                   {selectedLook.tags && selectedLook.tags.length > 0 ? (
//                     <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
//                       {selectedLook.tags.map((t, i) => (
//                         <View
//                           key={`${t}-${i}`} // ✅ unique even if duplicate values
//                           style={{
//                             backgroundColor: surface2,
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 12,
//                             marginRight: 6,
//                             marginBottom: 6,
//                           }}>
//                           <Text style={{color: theme.colors.foreground}}>
//                             #{t}
//                           </Text>
//                         </View>
//                       ))}
//                     </View>
//                   ) : (
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 14,
//                         marginTop: 4,
//                       }}>
//                       AI is analyzing this look...
//                     </Text>
//                   )}

//                   {/* Build Look button */}
//                   <TouchableOpacity
//                     activeOpacity={0.9}
//                     onPress={() => {
//                       console.log('[Hub] Touchable pressed');
//                       handleRecreate();
//                     }}
//                     style={{
//                       marginTop: tokens.spacing.md,
//                       backgroundColor: theme.colors.primary,
//                       paddingVertical: 14,
//                       borderRadius: tokens.borderRadius.xl,
//                       alignItems: 'center',
//                       opacity: recreating ? 0.7 : 1,
//                     }}
//                     disabled={recreating}>
//                     {recreating ? (
//                       <ActivityIndicator color="white" />
//                     ) : (
//                       <Text
//                         style={{
//                           color: 'white',
//                           fontWeight: '600',
//                           fontSize: 16,
//                         }}>
//                         Build This Look
//                       </Text>
//                     )}
//                   </TouchableOpacity>
//                 </View>

//                 <AppleTouchFeedback onPress={closeLook}>
//                   <View
//                     style={{
//                       position: 'absolute',
//                       top: 20,
//                       right: 20,
//                       backgroundColor: 'rgba(0,0,0,0.45)',
//                       borderRadius: 30,
//                       padding: 6,
//                     }}>
//                     <MaterialIcons name="close" size={26} color="white" />
//                   </View>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             </View>
//           )}
//         </Modal>
//       </View>
//     );
//   } catch (err: any) {
//     console.error('[Hub] 💥 Render error:', err);
//     return (
//       <View
//         style={{
//           flex: 1,
//           justifyContent: 'center',
//           alignItems: 'center',
//           padding: 20,
//           backgroundColor: '#000',
//         }}>
//         <Text style={{color: 'red', fontSize: 16}}>
//           Render error: {String(err.message || err)}
//         </Text>
//       </View>
//     );
//   }
// }

////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
//   Dimensions,
//   ActivityIndicator,
//   StyleSheet,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAnalyzeLook} from '../hooks/useAnalyzeLook';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {useUUID} from '../context/UUIDContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {width} = Dimensions.get('window');
// const CARD_SIZE = width / 2 - tokens.spacing.md * 1.5;

// type SavedLook = {
//   id: string;
//   image: string;
//   tags?: string[];
//   created_at: number;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// export default function InspirationHubScreen({navigate}: Props) {
//   console.log('[Hub] Mount start');

//   const {theme} = useAppTheme();
//   const {centeredSection} = useGlobalStyles();
//   const userId = useUUID();

//   const {analyzeLook, loading: analyzing} = useAnalyzeLook();
//   const {recreateLook, loading: recreating} = useRecreateLook();

//   const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
//   const [selectedLook, setSelectedLook] = useState<SavedLook | null>(null);

//   console.log('[Hub] UUID:', userId);

//   const modalBackdrop = 'rgba(0,0,0,0.4)';
//   const surface2 = theme.colors.surface2 || 'rgba(255,255,255,0.08)';

//   //   useEffect(() => {
//   //     console.log('[Hub] useEffect → setSavedLooks');
//   //     setSavedLooks([
//   //       {
//   //         id: '1',
//   //         image:
//   //           'https://images.unsplash.com/photo-1602810318383-4e6c78f90e0d?auto=format&w=800',
//   //         tags: [],
//   //         created_at: Date.now(),
//   //       },
//   //       {
//   //         id: '2',
//   //         image:
//   //           'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&w=800',
//   //         tags: [],
//   //         created_at: Date.now(),
//   //       },
//   //       {
//   //         id: '3',
//   //         image:
//   //           'https://images.unsplash.com/photo-1551854838-212c50b4c7c7?auto=format&w=800',
//   //         tags: [],
//   //         created_at: Date.now(),
//   //       },
//   //     ]);
//   //   }, []);

//   useEffect(() => {
//     console.log('[Hub] useEffect → setSavedLooks');
//     setSavedLooks([
//       {
//         id: '1',
//         image:
//           'https://storage.googleapis.com/stylhelpr-prod-bucket/uploads/2e/2e7b4297-72e4-4152-90bb-f00432c88ab7/images/e2fd128e-bb63-4ff0-b76f-8f83a21cad28-197D2845-8298-4F21-8414-7EDDA5EDE72C.png',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '2',
//         // ✅ keep an Unsplash one to see fallback still works
//         image:
//           'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '3',
//         image:
//           'https://storage.googleapis.com/stylhelpr-prod-bucket/wardrobe/test-streetwear-look.jpg',
//         tags: [],
//         created_at: Date.now(),
//       },
//     ]);
//   }, []);

//   //   const openLook = async (look: SavedLook) => {
//   //     console.log('[Hub] openLook →', look.id);
//   //     setSelectedLook(look);
//   //     if (!look.tags || look.tags.length === 0) {
//   //       try {
//   //         const result = await analyzeLook(look.image);
//   //         console.log('[Hub] analyzeLook result:', result);
//   //         if (result?.tags?.length) {
//   //           setSavedLooks(prev =>
//   //             prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
//   //           );
//   //           setSelectedLook({...look, tags: result.tags});
//   //         }
//   //       } catch (err) {
//   //         console.error('[Hub] AI analyze failed:', err);
//   //       }
//   //     }
//   //   };

//   const openLook = async (look: SavedLook) => {
//     console.log('[Hub] openLook →', look.id);
//     setSelectedLook(look);

//     if (!look.tags || look.tags.length === 0) {
//       try {
//         // 🔍 Log the exact image data before sending
//         const publicUrl = look.image;

//         const gsutilUri = look.image
//           .replace('https://storage.googleapis.com/', 'gs://')
//           .replace('storage.googleapis.com/', '');

//         console.log('[Hub] analyzeLook → constructed data:', {
//           publicUrl,
//           gsutilUri,
//         });

//         // ✅ Send both forms — hook auto-prefers gs:// when valid
//         const result = await analyzeLook({publicUrl, gsutilUri});

//         console.log('[Hub] analyzeLook result (raw):', result);

//         if (result?.tags?.length) {
//           console.log('[Hub] analyzeLook → tags detected:', result.tags);
//           setSavedLooks(prev =>
//             prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
//           );
//           setSelectedLook({...look, tags: result.tags});
//         } else {
//           console.log('[Hub] analyzeLook → no tags found in response');
//         }
//       } catch (err) {
//         console.error('[Hub] AI analyze failed:', err);
//       }
//     } else {
//       console.log('[Hub] Skipping analyze (tags already exist):', look.tags);
//     }
//   };

//   const closeLook = () => {
//     console.log('[Hub] closeLook');
//     setSelectedLook(null);
//   };

//   //   const handleRecreate = async () => {
//   //     console.log('[Hub] handleRecreate tapped!', selectedLook);
//   //     if (!selectedLook) {
//   //       console.log('[Hub] ❌ No selectedLook');
//   //       return;
//   //     }

//   //     ReactNativeHapticFeedback.trigger('impactMedium');

//   //     try {
//   //       const data = await recreateLook({
//   //         user_id: userId,
//   //         tags: selectedLook.tags || ['casual', 'modern', 'neutral'],
//   //       });

//   //       console.log('[Hub] 🧥 Recreated Outfit:', data);

//   //       // ✅ Convert OpenAI response into owned/recommendations structure
//   //       const mapped = {
//   //         owned: Array.isArray(data.outfit)
//   //           ? data.outfit.map((o: any, i: number) => ({
//   //               id: `${i}`,
//   //               name: o.item,
//   //               color: o.color,
//   //               brand: 'AI Styled',
//   //               image:
//   //                 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//   //             }))
//   //           : [],
//   //         recommendations: [],
//   //       };

//   //       console.log('[Hub] 🪄 Mapped data for RecreatedLook:', mapped);

//   //       closeLook();
//   //       navigate('RecreatedLook', {data: mapped});
//   //     } catch (err) {
//   //       console.error('[Hub] Recreate failed:', err);
//   //       closeLook();
//   //     }
//   //   };

//   const handleRecreate = async () => {
//     console.log('[Hub] handleRecreate tapped!', selectedLook);
//     if (!selectedLook) {
//       console.log('[Hub] ❌ No selectedLook');
//       return;
//     }

//     ReactNativeHapticFeedback.trigger('impactMedium');

//     try {
//       console.log('[Hub] 🧩 Preparing recreate payload:', {
//         user_id: userId,
//         tags: selectedLook.tags,
//         image_url: selectedLook.image,
//       });
//       // 🧠 Pass both the tags and actual image URL
//       const data = await recreateLook({
//         user_id: userId,
//         tags: selectedLook.tags || ['casual', 'modern', 'neutral'],
//         image_url: selectedLook.image, // 👈 crucial addition
//       });

//       console.log('[Hub] 🧥 Recreated Outfit:', data);

//       //   const mapped = {
//       //     owned: Array.isArray(data.outfit)
//       //       ? data.outfit.map((o: any, i: number) => ({
//       //           id: `${i}`,
//       //           name: o.item,
//       //           color: o.color,
//       //           brand: o.brand || 'AI Styled',
//       //           // 👇 now show the same look as a visual base reference
//       //           image: selectedLook.image,
//       //           shopUrl: o.shop_url || null,
//       //         }))
//       //       : [],
//       //     recommendations:
//       //       Array.isArray(data.recommendations) &&
//       //       data.recommendations.map((r: any, i: number) => ({
//       //         id: `rec-${i}`,
//       //         name: r.item,
//       //         color: r.color,
//       //         brand: r.brand || 'Suggested',
//       //         image: r.image || selectedLook.image,
//       //         shopUrl: r.shop_url || null,
//       //       })),
//       //   };

//       //   const mapped = {
//       //     owned: Array.isArray(data.outfit)
//       //       ? data.outfit.map((o: any, i: number) => {
//       //           const query = `${(o.item || o.category || 'fashion')
//       //             .replace(/[^a-zA-Z0-9 ]/g, '')
//       //             .trim()
//       //             .split(' ')
//       //             .join('-')}-${o.color || ''}`;

//       //           return {
//       //             id: `${i}`,
//       //             name: o.item,
//       //             color: o.color,
//       //             brand: o.brand || 'AI Styled',
//       //             // ✅ Direct Unsplash CDN image that works in RN (no redirects)
//       //             image: `https://images.unsplash.com/photo-${
//       //               1000 + i
//       //             }?crop=entropy&cs=tinysrgb&fit=crop&w=600&h=800&q=80&ixid=${encodeURIComponent(
//       //               query,
//       //             )}`,
//       //             shopUrl: o.shop_url || null,
//       //           };
//       //         })
//       //       : [],
//       //     recommendations:
//       //       Array.isArray(data.recommendations) &&
//       //       data.recommendations.map((r: any, i: number) => {
//       //         const query = `${(r.item || r.category || 'style')
//       //           .replace(/[^a-zA-Z0-9 ]/g, '')
//       //           .trim()
//       //           .split(' ')
//       //           .join('-')}-${r.color || ''}`;

//       //         return {
//       //           id: `rec-${i}`,
//       //           name: r.item,
//       //           color: r.color,
//       //           brand: r.brand || 'Suggested',
//       //           image: `https://images.unsplash.com/photo-${
//       //             1100 + i
//       //           }?crop=entropy&cs=tinysrgb&fit=crop&w=600&h=800&q=80&ixid=${encodeURIComponent(
//       //             query,
//       //           )}`,
//       //           shopUrl: r.shop_url || null,
//       //         };
//       //       }),
//       //   };

//       //   const unsplashFallbacks = [
//       //     // ✅ use real existing Unsplash photo IDs (safe and free)
//       //     '1666976176362-8df8659293ab', // beige overshirt
//       //     '1503341455253-b2e723bb3dbb', // grey tee
//       //     '1526170375885-4d8ecf77b99f', // ripped jeans
//       //     '1503342217505-b0a15ec3261c', // white sneakers
//       //   ];

//       //   const mapped = {
//       //     owned: Array.isArray(data.outfit)
//       //       ? data.outfit.map((o: any, i: number) => ({
//       //           id: `${i}`,
//       //           name: o.item,
//       //           color: o.color,
//       //           brand: o.brand || 'AI Styled',
//       //           image: `https://images.unsplash.com/photo-${
//       //             unsplashFallbacks[i % unsplashFallbacks.length]
//       //           }?auto=format&fit=crop&w=800&h=1000&q=80`,
//       //           shopUrl: o.shop_url || null,
//       //         }))
//       //       : [],
//       //     recommendations:
//       //       Array.isArray(data.recommendations) &&
//       //       data.recommendations.map((r: any, i: number) => ({
//       //         id: `rec-${i}`,
//       //         name: r.item,
//       //         color: r.color,
//       //         brand: r.brand || 'Suggested',
//       //         image: `https://images.unsplash.com/photo-${
//       //           unsplashFallbacks[i % unsplashFallbacks.length]
//       //         }?auto=format&fit=crop&w=800&h=1000&q=80`,
//       //         shopUrl: r.shop_url || null,
//       //       })),
//       //   };

//       // At top of the file, add your Unsplash API key once:
//       const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

//       async function getUnsplashImage(query: string) {
//         try {
//           const res = await fetch(
//             `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
//               query,
//             )}&orientation=portrait&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`,
//           );
//           const data = await res.json();
//           return (
//             data?.results?.[0]?.urls?.regular ||
//             'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'
//           );
//         } catch {
//           return 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';
//         }
//       }

//       // inside handleRecreate → after const data = await recreateLook(...);
//       const mapped = {
//         owned: await Promise.all(
//           (data.outfit || []).map(async (o: any, i: number) => {
//             const query = `${o.item || o.category} ${o.color || ''}`.trim();
//             const image = await getUnsplashImage(query);
//             return {
//               id: `${i}`,
//               name: o.item,
//               color: o.color,
//               brand: o.brand || 'AI Styled',
//               image,
//               shopUrl: o.shop_url || null,
//             };
//           }),
//         ),
//         recommendations: await Promise.all(
//           (data.recommendations || []).map(async (r: any, i: number) => {
//             const query = `${r.item || r.category} ${r.color || ''}`.trim();
//             const image = await getUnsplashImage(query);
//             return {
//               id: `rec-${i}`,
//               name: r.item,
//               color: r.color,
//               brand: r.brand || 'Suggested',
//               image,
//               shopUrl: r.shop_url || null,
//             };
//           }),
//         ),
//       };

//       console.log('[Hub] 🪄 Mapped data for RecreatedLook:', mapped);

//       closeLook();
//       navigate('RecreatedLook', {data: mapped});
//     } catch (err) {
//       console.error('[Hub] Recreate failed:', err);
//       closeLook();
//     }
//   };

//   try {
//     console.log('[Hub] Render start');
//     return (
//       <View style={{flex: 1, backgroundColor: theme.colors.background}}>
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={[
//             centeredSection,
//             {paddingTop: tokens.spacing.xl, paddingBottom: 120},
//           ]}>
//           {console.log('[Hub] Rendering ScrollView content')}

//           {/* Header */}
//           <Text
//             style={{
//               fontSize: 28,
//               fontWeight: '700',
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.sm,
//             }}>
//             Inspiration Hub
//           </Text>
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.lg,
//               fontSize: 16,
//             }}>
//             Your saved outfit ideas — tap any look to explore or recreate.
//           </Text>

//           {/* Grid */}
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               justifyContent: 'flex-start',
//             }}>
//             {savedLooks.map((item, index) => (
//               <Animatable.View
//                 key={item.id}
//                 animation="fadeInUp"
//                 delay={index * 80}
//                 duration={400}
//                 style={{
//                   width: CARD_SIZE,
//                   height: CARD_SIZE * 1.3,
//                   borderRadius: tokens.borderRadius.lg,
//                   overflow: 'hidden',
//                   backgroundColor:
//                     theme.colors.surface || 'rgba(255,255,255,0.08)',
//                   marginRight: index % 2 === 0 ? tokens.spacing.md : 0,
//                   marginBottom: tokens.spacing.md,
//                 }}>
//                 <TouchableOpacity
//                   activeOpacity={0.8}
//                   onPress={() => openLook(item)}>
//                   <Image
//                     source={{uri: item.image}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                   {analyzing && selectedLook?.id === item.id && (
//                     <View
//                       style={{
//                         ...StyleSheet.absoluteFillObject,
//                         backgroundColor: 'rgba(0,0,0,0.3)',
//                         justifyContent: 'center',
//                         alignItems: 'center',
//                       }}>
//                       <ActivityIndicator color="#fff" size="large" />
//                     </View>
//                   )}
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </ScrollView>

//         {/* Modal */}
//         <Modal visible={!!selectedLook} animationType="fade" transparent>
//           {selectedLook && (
//             <View
//               pointerEvents="box-none"
//               style={{
//                 flex: 1,
//                 backgroundColor: modalBackdrop,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 padding: tokens.spacing.lg,
//               }}>
//               {console.log('[Hub] Rendering modal for look', selectedLook.id)}
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   width: '100%',
//                   maxWidth: 420,
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 <Image
//                   source={{uri: selectedLook.image}}
//                   style={{width: '100%', height: 500}}
//                   resizeMode="cover"
//                 />

//                 <View style={{padding: tokens.spacing.md}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 20,
//                       fontWeight: '600',
//                       marginBottom: 6,
//                     }}>
//                     Recreate This Look
//                   </Text>

//                   {/* Tags */}
//                   {selectedLook.tags && selectedLook.tags.length > 0 ? (
//                     <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
//                       {selectedLook.tags.map((t, i) => (
//                         <View
//                           key={`${t}-${i}`} // ✅ unique even if duplicate values
//                           style={{
//                             backgroundColor: surface2,
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 12,
//                             marginRight: 6,
//                             marginBottom: 6,
//                           }}>
//                           <Text style={{color: theme.colors.foreground}}>
//                             #{t}
//                           </Text>
//                         </View>
//                       ))}
//                     </View>
//                   ) : (
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 14,
//                         marginTop: 4,
//                       }}>
//                       AI is analyzing this look...
//                     </Text>
//                   )}

//                   {/* Build Look button */}
//                   <TouchableOpacity
//                     activeOpacity={0.9}
//                     onPress={() => {
//                       console.log('[Hub] Touchable pressed');
//                       handleRecreate();
//                     }}
//                     style={{
//                       marginTop: tokens.spacing.md,
//                       backgroundColor: theme.colors.primary,
//                       paddingVertical: 14,
//                       borderRadius: tokens.borderRadius.xl,
//                       alignItems: 'center',
//                       opacity: recreating ? 0.7 : 1,
//                     }}
//                     disabled={recreating}>
//                     {recreating ? (
//                       <ActivityIndicator color="white" />
//                     ) : (
//                       <Text
//                         style={{
//                           color: 'white',
//                           fontWeight: '600',
//                           fontSize: 16,
//                         }}>
//                         Build This Look
//                       </Text>
//                     )}
//                   </TouchableOpacity>
//                 </View>

//                 <AppleTouchFeedback onPress={closeLook}>
//                   <View
//                     style={{
//                       position: 'absolute',
//                       top: 20,
//                       right: 20,
//                       backgroundColor: 'rgba(0,0,0,0.45)',
//                       borderRadius: 30,
//                       padding: 6,
//                     }}>
//                     <MaterialIcons name="close" size={26} color="white" />
//                   </View>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             </View>
//           )}
//         </Modal>
//       </View>
//     );
//   } catch (err: any) {
//     console.error('[Hub] 💥 Render error:', err);
//     return (
//       <View
//         style={{
//           flex: 1,
//           justifyContent: 'center',
//           alignItems: 'center',
//           padding: 20,
//           backgroundColor: '#000',
//         }}>
//         <Text style={{color: 'red', fontSize: 16}}>
//           Render error: {String(err.message || err)}
//         </Text>
//       </View>
//     );
//   }
// }

///////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
//   Dimensions,
//   ActivityIndicator,
//   StyleSheet,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAnalyzeLook} from '../hooks/useAnalyzeLook';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {useUUID} from '../context/UUIDContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {width} = Dimensions.get('window');
// const CARD_SIZE = width / 2 - tokens.spacing.md * 1.5;

// type SavedLook = {
//   id: string;
//   image: string;
//   tags?: string[];
//   created_at: number;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// export default function InspirationHubScreen({navigate}: Props) {
//   console.log('[Hub] Mount start');

//   const {theme} = useAppTheme();
//   const {centeredSection} = useGlobalStyles();
//   const userId = useUUID();

//   const {analyzeLook, loading: analyzing} = useAnalyzeLook();
//   const {recreateLook, loading: recreating} = useRecreateLook();

//   const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
//   const [selectedLook, setSelectedLook] = useState<SavedLook | null>(null);

//   console.log('[Hub] UUID:', userId);

//   const modalBackdrop = 'rgba(0,0,0,0.4)';
//   const surface2 = theme.colors.surface2 || 'rgba(255,255,255,0.08)';

//   //   useEffect(() => {
//   //     console.log('[Hub] useEffect → setSavedLooks');
//   //     setSavedLooks([
//   //       {
//   //         id: '1',
//   //         image:
//   //           'https://images.unsplash.com/photo-1602810318383-4e6c78f90e0d?auto=format&w=800',
//   //         tags: [],
//   //         created_at: Date.now(),
//   //       },
//   //       {
//   //         id: '2',
//   //         image:
//   //           'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&w=800',
//   //         tags: [],
//   //         created_at: Date.now(),
//   //       },
//   //       {
//   //         id: '3',
//   //         image:
//   //           'https://images.unsplash.com/photo-1551854838-212c50b4c7c7?auto=format&w=800',
//   //         tags: [],
//   //         created_at: Date.now(),
//   //       },
//   //     ]);
//   //   }, []);

//   useEffect(() => {
//     console.log('[Hub] useEffect → setSavedLooks');
//     setSavedLooks([
//       {
//         id: '1',
//         image:
//           'https://storage.googleapis.com/stylhelpr-prod-bucket/uploads/2e/2e7b4297-72e4-4152-90bb-f00432c88ab7/images/e2fd128e-bb63-4ff0-b76f-8f83a21cad28-197D2845-8298-4F21-8414-7EDDA5EDE72C.png',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '2',
//         // ✅ keep an Unsplash one to see fallback still works
//         image:
//           'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '3',
//         image:
//           'https://storage.googleapis.com/stylhelpr-prod-bucket/wardrobe/test-streetwear-look.jpg',
//         tags: [],
//         created_at: Date.now(),
//       },
//     ]);
//   }, []);

//   //   const openLook = async (look: SavedLook) => {
//   //     console.log('[Hub] openLook →', look.id);
//   //     setSelectedLook(look);
//   //     if (!look.tags || look.tags.length === 0) {
//   //       try {
//   //         const result = await analyzeLook(look.image);
//   //         console.log('[Hub] analyzeLook result:', result);
//   //         if (result?.tags?.length) {
//   //           setSavedLooks(prev =>
//   //             prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
//   //           );
//   //           setSelectedLook({...look, tags: result.tags});
//   //         }
//   //       } catch (err) {
//   //         console.error('[Hub] AI analyze failed:', err);
//   //       }
//   //     }
//   //   };

//   const openLook = async (look: SavedLook) => {
//     console.log('[Hub] openLook →', look.id);
//     setSelectedLook(look);

//     if (!look.tags || look.tags.length === 0) {
//       try {
//         // 🔍 Log the exact image data before sending
//         const publicUrl = look.image;

//         const gsutilUri = look.image
//           .replace('https://storage.googleapis.com/', 'gs://')
//           .replace('storage.googleapis.com/', '');

//         console.log('[Hub] analyzeLook → constructed data:', {
//           publicUrl,
//           gsutilUri,
//         });

//         // ✅ Send both forms — hook auto-prefers gs:// when valid
//         const result = await analyzeLook({publicUrl, gsutilUri});

//         console.log('[Hub] analyzeLook result (raw):', result);

//         if (result?.tags?.length) {
//           console.log('[Hub] analyzeLook → tags detected:', result.tags);
//           setSavedLooks(prev =>
//             prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
//           );
//           setSelectedLook({...look, tags: result.tags});
//         } else {
//           console.log('[Hub] analyzeLook → no tags found in response');
//         }
//       } catch (err) {
//         console.error('[Hub] AI analyze failed:', err);
//       }
//     } else {
//       console.log('[Hub] Skipping analyze (tags already exist):', look.tags);
//     }
//   };

//   const closeLook = () => {
//     console.log('[Hub] closeLook');
//     setSelectedLook(null);
//   };

//   const handleRecreate = async () => {
//     console.log('[Hub] handleRecreate tapped!', selectedLook);
//     if (!selectedLook) {
//       console.log('[Hub] ❌ No selectedLook');
//       return;
//     }

//     ReactNativeHapticFeedback.trigger('impactMedium');

//     try {
//       const data = await recreateLook({
//         user_id: userId,
//         tags: selectedLook.tags || ['casual', 'modern', 'neutral'],
//       });

//       console.log('[Hub] 🧥 Recreated Outfit:', data);

//       // ✅ Convert OpenAI response into owned/recommendations structure
//       const mapped = {
//         owned: Array.isArray(data.outfit)
//           ? data.outfit.map((o: any, i: number) => ({
//               id: `${i}`,
//               name: o.item,
//               color: o.color,
//               brand: 'AI Styled',
//               image:
//                 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//             }))
//           : [],
//         recommendations: [],
//       };

//       console.log('[Hub] 🪄 Mapped data for RecreatedLook:', mapped);

//       closeLook();
//       navigate('RecreatedLook', {data: mapped});
//     } catch (err) {
//       console.error('[Hub] Recreate failed:', err);
//       closeLook();
//     }
//   };

//   try {
//     console.log('[Hub] Render start');
//     return (
//       <View style={{flex: 1, backgroundColor: theme.colors.background}}>
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={[
//             centeredSection,
//             {paddingTop: tokens.spacing.xl, paddingBottom: 120},
//           ]}>
//           {console.log('[Hub] Rendering ScrollView content')}

//           {/* Header */}
//           <Text
//             style={{
//               fontSize: 28,
//               fontWeight: '700',
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.sm,
//             }}>
//             Inspiration Hub
//           </Text>
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.lg,
//               fontSize: 16,
//             }}>
//             Your saved outfit ideas — tap any look to explore or recreate.
//           </Text>

//           {/* Grid */}
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               justifyContent: 'flex-start',
//             }}>
//             {savedLooks.map((item, index) => (
//               <Animatable.View
//                 key={item.id}
//                 animation="fadeInUp"
//                 delay={index * 80}
//                 duration={400}
//                 style={{
//                   width: CARD_SIZE,
//                   height: CARD_SIZE * 1.3,
//                   borderRadius: tokens.borderRadius.lg,
//                   overflow: 'hidden',
//                   backgroundColor:
//                     theme.colors.surface || 'rgba(255,255,255,0.08)',
//                   marginRight: index % 2 === 0 ? tokens.spacing.md : 0,
//                   marginBottom: tokens.spacing.md,
//                 }}>
//                 <TouchableOpacity
//                   activeOpacity={0.8}
//                   onPress={() => openLook(item)}>
//                   <Image
//                     source={{uri: item.image}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                   {analyzing && selectedLook?.id === item.id && (
//                     <View
//                       style={{
//                         ...StyleSheet.absoluteFillObject,
//                         backgroundColor: 'rgba(0,0,0,0.3)',
//                         justifyContent: 'center',
//                         alignItems: 'center',
//                       }}>
//                       <ActivityIndicator color="#fff" size="large" />
//                     </View>
//                   )}
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </ScrollView>

//         {/* Modal */}
//         <Modal visible={!!selectedLook} animationType="fade" transparent>
//           {selectedLook && (
//             <View
//               pointerEvents="box-none"
//               style={{
//                 flex: 1,
//                 backgroundColor: modalBackdrop,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 padding: tokens.spacing.lg,
//               }}>
//               {console.log('[Hub] Rendering modal for look', selectedLook.id)}
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   width: '100%',
//                   maxWidth: 420,
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 <Image
//                   source={{uri: selectedLook.image}}
//                   style={{width: '100%', height: 500}}
//                   resizeMode="cover"
//                 />

//                 <View style={{padding: tokens.spacing.md}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 20,
//                       fontWeight: '600',
//                       marginBottom: 6,
//                     }}>
//                     Recreate This Look
//                   </Text>

//                   {/* Tags */}
//                   {selectedLook.tags && selectedLook.tags.length > 0 ? (
//                     <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
//                       {selectedLook.tags.map(t => (
//                         <View
//                           key={t}
//                           style={{
//                             backgroundColor: surface2,
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 12,
//                             marginRight: 6,
//                             marginBottom: 6,
//                           }}>
//                           <Text style={{color: theme.colors.foreground}}>
//                             #{t}
//                           </Text>
//                         </View>
//                       ))}
//                     </View>
//                   ) : (
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 14,
//                         marginTop: 4,
//                       }}>
//                       AI is analyzing this look...
//                     </Text>
//                   )}

//                   {/* Build Look button */}
//                   <TouchableOpacity
//                     activeOpacity={0.9}
//                     onPress={() => {
//                       console.log('[Hub] Touchable pressed');
//                       handleRecreate();
//                     }}
//                     style={{
//                       marginTop: tokens.spacing.md,
//                       backgroundColor: theme.colors.primary,
//                       paddingVertical: 14,
//                       borderRadius: tokens.borderRadius.xl,
//                       alignItems: 'center',
//                       opacity: recreating ? 0.7 : 1,
//                     }}
//                     disabled={recreating}>
//                     {recreating ? (
//                       <ActivityIndicator color="white" />
//                     ) : (
//                       <Text
//                         style={{
//                           color: 'white',
//                           fontWeight: '600',
//                           fontSize: 16,
//                         }}>
//                         Build This Look
//                       </Text>
//                     )}
//                   </TouchableOpacity>
//                 </View>

//                 <AppleTouchFeedback onPress={closeLook}>
//                   <View
//                     style={{
//                       position: 'absolute',
//                       top: 20,
//                       right: 20,
//                       backgroundColor: 'rgba(0,0,0,0.45)',
//                       borderRadius: 30,
//                       padding: 6,
//                     }}>
//                     <MaterialIcons name="close" size={26} color="white" />
//                   </View>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             </View>
//           )}
//         </Modal>
//       </View>
//     );
//   } catch (err: any) {
//     console.error('[Hub] 💥 Render error:', err);
//     return (
//       <View
//         style={{
//           flex: 1,
//           justifyContent: 'center',
//           alignItems: 'center',
//           padding: 20,
//           backgroundColor: '#000',
//         }}>
//         <Text style={{color: 'red', fontSize: 16}}>
//           Render error: {String(err.message || err)}
//         </Text>
//       </View>
//     );
//   }
// }

///////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
//   Dimensions,
//   ActivityIndicator,
//   StyleSheet,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAnalyzeLook} from '../hooks/useAnalyzeLook';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {useUUID} from '../context/UUIDContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {width} = Dimensions.get('window');
// const CARD_SIZE = width / 2 - tokens.spacing.md * 1.5;

// type SavedLook = {
//   id: string;
//   image: string;
//   tags?: string[];
//   created_at: number;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// export default function InspirationHubScreen({navigate}: Props) {
//   console.log('[Hub] Mount start');

//   const {theme} = useAppTheme();
//   const {centeredSection} = useGlobalStyles();
//   const userId = useUUID();

//   const {analyzeLook, loading: analyzing} = useAnalyzeLook();
//   const {recreateLook, loading: recreating} = useRecreateLook();

//   const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
//   const [selectedLook, setSelectedLook] = useState<SavedLook | null>(null);

//   console.log('[Hub] UUID:', userId);

//   const modalBackdrop = 'rgba(0,0,0,0.4)';
//   const surface2 = theme.colors.surface2 || 'rgba(255,255,255,0.08)';

//   useEffect(() => {
//     console.log('[Hub] useEffect → setSavedLooks');
//     setSavedLooks([
//       {
//         id: '1',
//         image:
//           'https://images.unsplash.com/photo-1602810318383-4e6c78f90e0d?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '2',
//         image:
//           'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '3',
//         image:
//           'https://images.unsplash.com/photo-1551854838-212c50b4c7c7?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//     ]);
//   }, []);

//   //   const openLook = async (look: SavedLook) => {
//   //     console.log('[Hub] openLook →', look.id);
//   //     setSelectedLook(look);
//   //     if (!look.tags || look.tags.length === 0) {
//   //       try {
//   //         const result = await analyzeLook(look.image);
//   //         console.log('[Hub] analyzeLook result:', result);
//   //         if (result?.tags?.length) {
//   //           setSavedLooks(prev =>
//   //             prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
//   //           );
//   //           setSelectedLook({...look, tags: result.tags});
//   //         }
//   //       } catch (err) {
//   //         console.error('[Hub] AI analyze failed:', err);
//   //       }
//   //     }
//   //   };

//   const openLook = async (look: SavedLook) => {
//     console.log('[Hub] openLook →', look.id);
//     setSelectedLook(look);

//     if (!look.tags || look.tags.length === 0) {
//       try {
//         // 🔍 Log the exact image data before sending
//         const publicUrl = look.image;
//         const gsutilUri = look.image.replace(
//           'https://storage.googleapis.com/',
//           'gs://',
//         );

//         console.log('[Hub] analyzeLook → constructed data:', {
//           publicUrl,
//           gsutilUri,
//         });

//         // ✅ Send both forms — hook auto-prefers gs:// when valid
//         const result = await analyzeLook({publicUrl, gsutilUri});

//         console.log('[Hub] analyzeLook result (raw):', result);

//         if (result?.tags?.length) {
//           console.log('[Hub] analyzeLook → tags detected:', result.tags);
//           setSavedLooks(prev =>
//             prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
//           );
//           setSelectedLook({...look, tags: result.tags});
//         } else {
//           console.log('[Hub] analyzeLook → no tags found in response');
//         }
//       } catch (err) {
//         console.error('[Hub] AI analyze failed:', err);
//       }
//     } else {
//       console.log('[Hub] Skipping analyze (tags already exist):', look.tags);
//     }
//   };

//   const closeLook = () => {
//     console.log('[Hub] closeLook');
//     setSelectedLook(null);
//   };

//   const handleRecreate = async () => {
//     console.log('[Hub] handleRecreate tapped!', selectedLook);
//     if (!selectedLook) {
//       console.log('[Hub] ❌ No selectedLook');
//       return;
//     }

//     ReactNativeHapticFeedback.trigger('impactMedium');

//     try {
//       const data = await recreateLook({
//         user_id: userId,
//         tags: selectedLook.tags || ['casual', 'modern', 'neutral'],
//       });

//       console.log('[Hub] 🧥 Recreated Outfit:', data);

//       // ✅ Convert OpenAI response into owned/recommendations structure
//       const mapped = {
//         owned: Array.isArray(data.outfit)
//           ? data.outfit.map((o: any, i: number) => ({
//               id: `${i}`,
//               name: o.item,
//               color: o.color,
//               brand: 'AI Styled',
//               image:
//                 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//             }))
//           : [],
//         recommendations: [],
//       };

//       console.log('[Hub] 🪄 Mapped data for RecreatedLook:', mapped);

//       closeLook();
//       navigate('RecreatedLook', {data: mapped});
//     } catch (err) {
//       console.error('[Hub] Recreate failed:', err);
//       closeLook();
//     }
//   };

//   try {
//     console.log('[Hub] Render start');
//     return (
//       <View style={{flex: 1, backgroundColor: theme.colors.background}}>
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={[
//             centeredSection,
//             {paddingTop: tokens.spacing.xl, paddingBottom: 120},
//           ]}>
//           {console.log('[Hub] Rendering ScrollView content')}

//           {/* Header */}
//           <Text
//             style={{
//               fontSize: 28,
//               fontWeight: '700',
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.sm,
//             }}>
//             Inspiration Hub
//           </Text>
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.lg,
//               fontSize: 16,
//             }}>
//             Your saved outfit ideas — tap any look to explore or recreate.
//           </Text>

//           {/* Grid */}
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               justifyContent: 'flex-start',
//             }}>
//             {savedLooks.map((item, index) => (
//               <Animatable.View
//                 key={item.id}
//                 animation="fadeInUp"
//                 delay={index * 80}
//                 duration={400}
//                 style={{
//                   width: CARD_SIZE,
//                   height: CARD_SIZE * 1.3,
//                   borderRadius: tokens.borderRadius.lg,
//                   overflow: 'hidden',
//                   backgroundColor:
//                     theme.colors.surface || 'rgba(255,255,255,0.08)',
//                   marginRight: index % 2 === 0 ? tokens.spacing.md : 0,
//                   marginBottom: tokens.spacing.md,
//                 }}>
//                 <TouchableOpacity
//                   activeOpacity={0.8}
//                   onPress={() => openLook(item)}>
//                   <Image
//                     source={{uri: item.image}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                   {analyzing && selectedLook?.id === item.id && (
//                     <View
//                       style={{
//                         ...StyleSheet.absoluteFillObject,
//                         backgroundColor: 'rgba(0,0,0,0.3)',
//                         justifyContent: 'center',
//                         alignItems: 'center',
//                       }}>
//                       <ActivityIndicator color="#fff" size="large" />
//                     </View>
//                   )}
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </ScrollView>

//         {/* Modal */}
//         <Modal visible={!!selectedLook} animationType="fade" transparent>
//           {selectedLook && (
//             <View
//               pointerEvents="box-none"
//               style={{
//                 flex: 1,
//                 backgroundColor: modalBackdrop,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 padding: tokens.spacing.lg,
//               }}>
//               {console.log('[Hub] Rendering modal for look', selectedLook.id)}
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   width: '100%',
//                   maxWidth: 420,
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 <Image
//                   source={{uri: selectedLook.image}}
//                   style={{width: '100%', height: 500}}
//                   resizeMode="cover"
//                 />

//                 <View style={{padding: tokens.spacing.md}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 20,
//                       fontWeight: '600',
//                       marginBottom: 6,
//                     }}>
//                     Recreate This Look
//                   </Text>

//                   {/* Tags */}
//                   {selectedLook.tags && selectedLook.tags.length > 0 ? (
//                     <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
//                       {selectedLook.tags.map(t => (
//                         <View
//                           key={t}
//                           style={{
//                             backgroundColor: surface2,
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 12,
//                             marginRight: 6,
//                             marginBottom: 6,
//                           }}>
//                           <Text style={{color: theme.colors.foreground}}>
//                             #{t}
//                           </Text>
//                         </View>
//                       ))}
//                     </View>
//                   ) : (
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 14,
//                         marginTop: 4,
//                       }}>
//                       AI is analyzing this look...
//                     </Text>
//                   )}

//                   {/* Build Look button */}
//                   <TouchableOpacity
//                     activeOpacity={0.9}
//                     onPress={() => {
//                       console.log('[Hub] Touchable pressed');
//                       handleRecreate();
//                     }}
//                     style={{
//                       marginTop: tokens.spacing.md,
//                       backgroundColor: theme.colors.primary,
//                       paddingVertical: 14,
//                       borderRadius: tokens.borderRadius.xl,
//                       alignItems: 'center',
//                       opacity: recreating ? 0.7 : 1,
//                     }}
//                     disabled={recreating}>
//                     {recreating ? (
//                       <ActivityIndicator color="white" />
//                     ) : (
//                       <Text
//                         style={{
//                           color: 'white',
//                           fontWeight: '600',
//                           fontSize: 16,
//                         }}>
//                         Build This Look
//                       </Text>
//                     )}
//                   </TouchableOpacity>
//                 </View>

//                 <AppleTouchFeedback onPress={closeLook}>
//                   <View
//                     style={{
//                       position: 'absolute',
//                       top: 20,
//                       right: 20,
//                       backgroundColor: 'rgba(0,0,0,0.45)',
//                       borderRadius: 30,
//                       padding: 6,
//                     }}>
//                     <MaterialIcons name="close" size={26} color="white" />
//                   </View>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             </View>
//           )}
//         </Modal>
//       </View>
//     );
//   } catch (err: any) {
//     console.error('[Hub] 💥 Render error:', err);
//     return (
//       <View
//         style={{
//           flex: 1,
//           justifyContent: 'center',
//           alignItems: 'center',
//           padding: 20,
//           backgroundColor: '#000',
//         }}>
//         <Text style={{color: 'red', fontSize: 16}}>
//           Render error: {String(err.message || err)}
//         </Text>
//       </View>
//     );
//   }
// }

///////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
//   Dimensions,
//   ActivityIndicator,
//   StyleSheet,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAnalyzeLook} from '../hooks/useAnalyzeLook';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {useUUID} from '../context/UUIDContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {width} = Dimensions.get('window');
// const CARD_SIZE = width / 2 - tokens.spacing.md * 1.5;

// type SavedLook = {
//   id: string;
//   image: string;
//   tags?: string[];
//   created_at: number;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// export default function InspirationHubScreen({navigate}: Props) {
//   console.log('[Hub] Mount start');

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {centeredSection} = useGlobalStyles();
//   const userId = useUUID();

//   const {analyzeLook, loading: analyzing} = useAnalyzeLook();
//   const {recreateLook, loading: recreating} = useRecreateLook();

//   console.log('[Hub] UUID:', userId);

//   const modalBackdrop = 'rgba(0,0,0,0.4)';
//   const surface2 = theme.colors.surface2 || 'rgba(255,255,255,0.08)';

//   const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
//   const [selectedLook, setSelectedLook] = useState<SavedLook | null>(null);

//   useEffect(() => {
//     console.log('[Hub] useEffect → setSavedLooks');
//     setSavedLooks([
//       {
//         id: '1',
//         image:
//           'https://images.unsplash.com/photo-1602810318383-4e6c78f90e0d?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '2',
//         image:
//           'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '3',
//         image:
//           'https://images.unsplash.com/photo-1551854838-212c50b4c7c7?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//     ]);
//   }, []);

//   const openLook = async (look: SavedLook) => {
//     console.log('[Hub] openLook →', look.id);
//     setSelectedLook(look);
//     if (!look.tags || look.tags.length === 0) {
//       try {
//         const result = await analyzeLook(look.image);
//         console.log('[Hub] analyzeLook result:', result);
//         if (result?.tags?.length) {
//           setSavedLooks(prev =>
//             prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
//           );
//           setSelectedLook({...look, tags: result.tags});
//         }
//       } catch (err) {
//         console.error('[Hub] AI analyze failed:', err);
//       }
//     }
//   };

//   const closeLook = () => {
//     console.log('[Hub] closeLook');
//     setSelectedLook(null);
//   };

//   const handleRecreate = async () => {
//     console.log('[Hub] handleRecreate tapped!', selectedLook);

//     if (!selectedLook) {
//       console.log('[Hub] ❌ No selectedLook');
//       return;
//     }

//     console.log('[Hub] selectedLook.tags', selectedLook.tags);

//     // Temporarily allow recreate even with empty tags, just to test press behavior
//     ReactNativeHapticFeedback.trigger('impactMedium');

//     try {
//       const data = await recreateLook({
//         user_id: userId,
//         tags: selectedLook.tags || ['casual', 'modern', 'neutral'],
//       });
//       console.log('[Hub] 🧥 Recreated Outfit:', data);
//       closeLook();
//       navigate('RecreatedLook', {data});
//     } catch (err) {
//       console.error('[Hub] Recreate failed:', err);
//       closeLook();
//     }
//   };

//   try {
//     console.log('[Hub] Render start');

//     return (
//       <View style={{flex: 1, backgroundColor: theme.colors.background}}>
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={[
//             centeredSection,
//             {paddingTop: tokens.spacing.xl, paddingBottom: 120},
//           ]}>
//           {console.log('[Hub] Rendering ScrollView content')}
//           {/* Header */}
//           <Text
//             style={{
//               fontSize: 28,
//               fontWeight: '700',
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.sm,
//             }}>
//             Inspiration Hub
//           </Text>
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.lg,
//               fontSize: 16,
//             }}>
//             Your saved outfit ideas — tap any look to explore or recreate.
//           </Text>

//           {/* Grid */}
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               justifyContent: 'flex-start',
//             }}>
//             {savedLooks.map((item, index) => (
//               <Animatable.View
//                 key={item.id}
//                 animation="fadeInUp"
//                 delay={index * 80}
//                 duration={400}
//                 style={{
//                   width: CARD_SIZE,
//                   height: CARD_SIZE * 1.3,
//                   borderRadius: tokens.borderRadius.lg,
//                   overflow: 'hidden',
//                   backgroundColor:
//                     theme.colors.surface || 'rgba(255,255,255,0.08)',
//                   marginRight: index % 2 === 0 ? tokens.spacing.md : 0,
//                   marginBottom: tokens.spacing.md,
//                 }}>
//                 <TouchableOpacity
//                   activeOpacity={0.8}
//                   onPress={() => openLook(item)}>
//                   <Image
//                     source={{uri: item.image}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                   {analyzing && selectedLook?.id === item.id && (
//                     <View
//                       style={{
//                         ...StyleSheet.absoluteFillObject,
//                         backgroundColor: 'rgba(0,0,0,0.3)',
//                         justifyContent: 'center',
//                         alignItems: 'center',
//                       }}>
//                       <ActivityIndicator color="#fff" size="large" />
//                     </View>
//                   )}
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </ScrollView>

//         {/* Modal */}
//         <Modal visible={!!selectedLook} animationType="fade" transparent>
//           {selectedLook && (
//             <View
//               pointerEvents="box-none"
//               style={{
//                 flex: 1,
//                 backgroundColor: modalBackdrop,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 padding: tokens.spacing.lg,
//               }}>
//               {console.log('[Hub] Rendering modal for look', selectedLook.id)}
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   width: '100%',
//                   maxWidth: 420,
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 <Image
//                   source={{uri: selectedLook.image}}
//                   style={{width: '100%', height: 500}}
//                   resizeMode="cover"
//                 />

//                 <View style={{padding: tokens.spacing.md}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 20,
//                       fontWeight: '600',
//                       marginBottom: 6,
//                     }}>
//                     Recreate This Look
//                   </Text>

//                   {/* Tags */}
//                   {selectedLook.tags && selectedLook.tags.length > 0 ? (
//                     <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
//                       {selectedLook.tags.map(t => (
//                         <View
//                           key={t}
//                           style={{
//                             backgroundColor: surface2,
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 12,
//                             marginRight: 6,
//                             marginBottom: 6,
//                           }}>
//                           <Text style={{color: theme.colors.foreground}}>
//                             #{t}
//                           </Text>
//                         </View>
//                       ))}
//                     </View>
//                   ) : (
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 14,
//                         marginTop: 4,
//                       }}>
//                       AI is analyzing this look...
//                     </Text>
//                   )}

//                   {/* Build Look button */}
//                   <TouchableOpacity
//                     activeOpacity={0.9}
//                     onPress={() => {
//                       console.log('[Hub] Touchable pressed');
//                       handleRecreate();
//                     }}
//                     style={{
//                       marginTop: tokens.spacing.md,
//                       backgroundColor: theme.colors.primary,
//                       paddingVertical: 14,
//                       borderRadius: tokens.borderRadius.xl,
//                       alignItems: 'center',
//                       opacity: recreating ? 0.7 : 1,
//                     }}
//                     disabled={recreating}>
//                     {recreating ? (
//                       <ActivityIndicator color="white" />
//                     ) : (
//                       <Text
//                         style={{
//                           color: 'white',
//                           fontWeight: '600',
//                           fontSize: 16,
//                         }}>
//                         Build This Look
//                       </Text>
//                     )}
//                   </TouchableOpacity>
//                 </View>

//                 <AppleTouchFeedback onPress={closeLook}>
//                   <View
//                     style={{
//                       position: 'absolute',
//                       top: 20,
//                       right: 20,
//                       backgroundColor: 'rgba(0,0,0,0.45)',
//                       borderRadius: 30,
//                       padding: 6,
//                     }}>
//                     <MaterialIcons name="close" size={26} color="white" />
//                   </View>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             </View>
//           )}
//         </Modal>
//       </View>
//     );
//   } catch (err: any) {
//     console.error('[Hub] 💥 Render error:', err);
//     return (
//       <View
//         style={{
//           flex: 1,
//           justifyContent: 'center',
//           alignItems: 'center',
//           padding: 20,
//           backgroundColor: '#000',
//         }}>
//         <Text style={{color: 'red', fontSize: 16}}>
//           Render error: {String(err.message || err)}
//         </Text>
//       </View>
//     );
//   }
// }

///////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
//   Dimensions,
//   ActivityIndicator,
//   StyleSheet,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAnalyzeLook} from '../hooks/useAnalyzeLook';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {useUUID} from '../context/UUIDContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const {width} = Dimensions.get('window');
// const CARD_SIZE = width / 2 - tokens.spacing.md * 1.5;

// type SavedLook = {
//   id: string;
//   image: string;
//   tags?: string[];
//   created_at: number;
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// export default function InspirationHubScreen({navigate}: Props) {
//   console.log('[Hub] Mount start');

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   console.log('[Hub] Theme loaded:', theme ? 'yes' : 'no');

//   const {centeredSection} = useGlobalStyles();
//   const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
//   const [selectedLook, setSelectedLook] = useState<SavedLook | null>(null);

//   const userId = useUUID();
//   console.log('[Hub] UUID:', userId);

//   const {analyzeLook, loading: analyzing} = useAnalyzeLook();
//   const {recreateLook, loading: recreating} = useRecreateLook();
//   console.log('[Hub] Hooks loaded');

//   const modalBackdrop = 'rgba(0,0,0,0.4)';
//   const surface2 = theme.colors.surface2 || 'rgba(255,255,255,0.08)';

//   useEffect(() => {
//     console.log('[Hub] useEffect → setSavedLooks');
//     setSavedLooks([
//       {
//         id: '1',
//         image:
//           'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '2',
//         image:
//           'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '3',
//         image:
//           'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//     ]);
//   }, []);

//   const openLook = async (look: SavedLook) => {
//     console.log('[Hub] openLook →', look.id);
//     setSelectedLook(look);
//     if (!look.tags || look.tags.length === 0) {
//       try {
//         const result = await analyzeLook(look.image);
//         console.log('[Hub] analyzeLook result:', result);
//         if (result?.tags?.length) {
//           setSavedLooks(prev =>
//             prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
//           );
//           setSelectedLook({...look, tags: result.tags});
//         }
//       } catch (err) {
//         console.error('[Hub] AI analyze failed:', err);
//       }
//     }
//   };

//   const closeLook = () => {
//     console.log('[Hub] closeLook');
//     setSelectedLook(null);
//   };

//   const handleRecreate = async () => {
//     console.log('HEELOOOOOO [Hub] handleRecreate for look', selectedLook.id);
//     if (!selectedLook?.tags?.length) return;
//     console.log('HEELOOOOOO [Hub] handleRecreate for look', selectedLook.id);
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       const data = await recreateLook({
//         user_id: userId,
//         tags: selectedLook.tags,
//       });
//       console.log('[Hub] 🧥 Recreated Outfit:', data);
//       closeLook();
//       navigate('RecreatedLook', {data});
//     } catch (err) {
//       console.error('[Hub] Recreate failed:', err);
//       closeLook();
//     }
//   };

//   try {
//     console.log('[Hub] Render start');
//     return (
//       <View style={{flex: 1, backgroundColor: theme.colors.background}}>
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={[
//             centeredSection,
//             {paddingTop: tokens.spacing.xl, paddingBottom: 120},
//           ]}>
//           {console.log('[Hub] Rendering ScrollView content')}
//           {/* Header */}
//           <Text
//             style={{
//               fontSize: 28,
//               fontWeight: '700',
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.sm,
//             }}>
//             Inspiration Hub
//           </Text>
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               marginBottom: tokens.spacing.lg,
//               fontSize: 16,
//             }}>
//             Your saved outfit ideas — tap any look to explore or recreate.
//           </Text>

//           {/* Grid */}
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               justifyContent: 'flex-start', // ✅ prevents gaps hiding elements
//             }}>
//             {savedLooks.map((item, index) => (
//               <Animatable.View
//                 key={item.id}
//                 animation="fadeInUp"
//                 delay={index * 80}
//                 duration={400}
//                 style={{
//                   width: CARD_SIZE,
//                   height: CARD_SIZE * 1.3,
//                   borderRadius: tokens.borderRadius.lg,
//                   overflow: 'hidden',
//                   backgroundColor:
//                     theme.colors.surface || 'rgba(255,255,255,0.08)', // ✅ visible surface
//                 }}>
//                 <TouchableOpacity
//                   activeOpacity={0.8}
//                   onPress={() => openLook(item)}>
//                   <Image
//                     source={{uri: item.image}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                   {analyzing && selectedLook?.id === item.id && (
//                     <View
//                       style={{
//                         ...StyleSheet.absoluteFillObject,
//                         backgroundColor: 'rgba(0,0,0,0.3)',
//                         justifyContent: 'center',
//                         alignItems: 'center',
//                       }}>
//                       <ActivityIndicator color="#fff" size="large" />
//                     </View>
//                   )}
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </ScrollView>

//         {/* Modal */}
//         <Modal visible={!!selectedLook} animationType="fade" transparent>
//           {selectedLook && (
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: modalBackdrop,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 padding: tokens.spacing.lg,
//               }}>
//               {console.log('[Hub] Rendering modal for look', selectedLook.id)}
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={300}
//                 style={{
//                   width: '100%',
//                   maxWidth: 420,
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 <Image
//                   source={{uri: selectedLook.image}}
//                   style={{width: '100%', height: 500}}
//                   resizeMode="cover"
//                 />

//                 <View style={{padding: tokens.spacing.md}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 20,
//                       fontWeight: '600',
//                       marginBottom: 6,
//                     }}>
//                     Recreate This Look
//                   </Text>

//                   {/* Tags */}
//                   {selectedLook.tags && selectedLook.tags.length > 0 ? (
//                     <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
//                       {selectedLook.tags.map(t => (
//                         <View
//                           key={t}
//                           style={{
//                             backgroundColor: surface2,
//                             paddingHorizontal: 10,
//                             paddingVertical: 4,
//                             borderRadius: 12,
//                             marginRight: 6,
//                             marginBottom: 6,
//                           }}>
//                           <Text style={{color: theme.colors.foreground}}>
//                             #{t}
//                           </Text>
//                         </View>
//                       ))}
//                     </View>
//                   ) : (
//                     <Text
//                       style={{
//                         color: 'theme.colors.foreground',
//                         fontSize: 14,
//                         marginTop: 4,
//                       }}>
//                       AI is analyzing this look...
//                     </Text>
//                   )}

//                   {/* Build Look button */}
//                   <TouchableOpacity
//                     activeOpacity={0.9}
//                     style={{
//                       marginTop: tokens.spacing.md,
//                       backgroundColor: theme.colors.foreground,
//                       paddingVertical: 14,
//                       borderRadius: tokens.borderRadius.xl,
//                       alignItems: 'center',
//                       opacity: recreating ? 0.7 : 1,
//                     }}
//                     disabled={recreating}
//                     onPress={handleRecreate}>
//                     {recreating ? (
//                       <ActivityIndicator color="white" />
//                     ) : (
//                       <Text
//                         style={{
//                           color: 'blue',
//                           fontWeight: '600',
//                           fontSize: 16,
//                         }}>
//                         Build This Look
//                       </Text>
//                     )}
//                   </TouchableOpacity>
//                 </View>

//                 <AppleTouchFeedback onPress={closeLook}>
//                   <View
//                     style={{
//                       position: 'absolute',
//                       top: 20,
//                       right: 20,
//                       backgroundColor: 'rgba(0,0,0,0.45)',
//                       borderRadius: 30,
//                       padding: 6,
//                     }}>
//                     <MaterialIcons name="close" size={26} color="white" />
//                   </View>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             </View>
//           )}
//         </Modal>
//       </View>
//     );
//   } catch (err: any) {
//     console.error('[Hub] 💥 Render error:', err);
//     return (
//       <View
//         style={{
//           flex: 1,
//           justifyContent: 'center',
//           alignItems: 'center',
//           padding: 20,
//           backgroundColor: '#000',
//         }}>
//         <Text style={{color: 'red', fontSize: 16}}>
//           Render error: {String(err.message || err)}
//         </Text>
//       </View>
//     );
//   }
// }

//////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
//   Dimensions,
//   ActivityIndicator,
//   StyleSheet,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAnalyzeLook} from '../hooks/useAnalyzeLook';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {useUUID} from '../context/UUIDContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useNavigation} from '@react-navigation/native';

// const {width} = Dimensions.get('window');
// const CARD_SIZE = width / 2 - tokens.spacing.md * 1.5;

// type SavedLook = {
//   id: string;
//   image: string;
//   tags?: string[];
//   created_at: number;
// };

// export default function InspirationHubScreen() {
//   const {theme} = useAppTheme();
//   const {centeredSection} = useGlobalStyles();
//   const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
//   const [selectedLook, setSelectedLook] = useState<SavedLook | null>(null);

//   const navigation = useNavigation<any>();
//   const {uuid} = useUUID();
//   const {analyzeLook, loading: analyzing} = useAnalyzeLook();
//   const {recreateLook, loading: recreating} = useRecreateLook();

//   useEffect(() => {
//     setSavedLooks([
//       {
//         id: '1',
//         image:
//           'https://images.unsplash.com/photo-1613553471445-5d3d9a0c1f5a?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '2',
//         image:
//           'https://images.unsplash.com/photo-1600185365973-96301a8099da?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//       {
//         id: '3',
//         image:
//           'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&w=800',
//         tags: [],
//         created_at: Date.now(),
//       },
//     ]);
//   }, []);

//   const openLook = async (look: SavedLook) => {
//     setSelectedLook(look);
//     if (!look.tags || look.tags.length === 0) {
//       try {
//         const result = await analyzeLook(look.image);
//         if (result?.tags?.length) {
//           setSavedLooks(prev =>
//             prev.map(l => (l.id === look.id ? {...l, tags: result.tags} : l)),
//           );
//           setSelectedLook({...look, tags: result.tags});
//         }
//       } catch (err) {
//         console.error('AI analyze failed:', err);
//       }
//     }
//   };

//   const closeLook = () => setSelectedLook(null);

//   const handleRecreate = async () => {
//     if (!selectedLook?.tags?.length) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     try {
//       const data = await recreateLook({
//         user_id: uuid,
//         tags: selectedLook.tags,
//       });
//       console.log('🧥 Recreated Outfit:', data);
//       closeLook();
//       navigation.navigate('RecreatedLook', {data});
//     } catch (err) {
//       console.error('Recreate failed:', err);
//       closeLook();
//     }
//   };

//   return (
//     <View style={{flex: 1, backgroundColor: theme.background}}>
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={[
//           centeredSection,
//           {paddingTop: tokens.spacing.xl, paddingBottom: 120},
//         ]}>
//         {/* Header */}
//         <Text
//           style={{
//             fontSize: 28,
//             fontWeight: '700',
//             color: theme.textPrimary,
//             marginBottom: tokens.spacing.sm,
//           }}>
//           Inspiration Hub
//         </Text>
//         <Text
//           style={{
//             color: theme.textSecondary,
//             marginBottom: tokens.spacing.lg,
//             fontSize: 16,
//           }}>
//           Your saved outfit ideas — tap any look to explore or recreate.
//         </Text>

//         {/* Manual grid (2-column) */}
//         <View
//           style={{
//             flexDirection: 'row',
//             flexWrap: 'wrap',
//             justifyContent: 'space-between',
//           }}>
//           {savedLooks.map((item, index) => (
//             <Animatable.View
//               key={item.id}
//               animation="fadeInUp"
//               delay={index * 80}
//               duration={400}
//               style={{
//                 marginBottom: tokens.spacing.md,
//                 width: CARD_SIZE,
//                 height: CARD_SIZE * 1.3,
//               }}>
//               <TouchableOpacity
//                 activeOpacity={0.8}
//                 onPress={() => openLook(item)}>
//                 <FrostedCard style={{flex: 1, overflow: 'hidden'}}>
//                   <Image
//                     source={{uri: item.image}}
//                     style={{width: '100%', height: '100%'}}
//                     resizeMode="cover"
//                   />
//                   {analyzing && selectedLook?.id === item.id && (
//                     <View
//                       style={{
//                         ...StyleSheet.absoluteFillObject,
//                         backgroundColor: 'rgba(0,0,0,0.3)',
//                         justifyContent: 'center',
//                         alignItems: 'center',
//                       }}>
//                       <ActivityIndicator color="#fff" size="large" />
//                     </View>
//                   )}
//                 </FrostedCard>
//               </TouchableOpacity>
//             </Animatable.View>
//           ))}
//         </View>
//       </ScrollView>

//       {/* Modal */}
//       <Modal visible={!!selectedLook} animationType="fade" transparent>
//         {selectedLook && (
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: theme.modalBackdrop,
//               justifyContent: 'center',
//               alignItems: 'center',
//               padding: tokens.spacing.lg,
//             }}>
//             <Animatable.View
//               animation="fadeInUp"
//               duration={300}
//               style={{
//                 width: '100%',
//                 maxWidth: 420,
//                 borderRadius: tokens.borderRadius['2xl'],
//                 overflow: 'hidden',
//                 backgroundColor: theme.card,
//               }}>
//               <Image
//                 source={{uri: selectedLook.image}}
//                 style={{width: '100%', height: 500}}
//                 resizeMode="cover"
//               />

//               <View style={{padding: tokens.spacing.md}}>
//                 <Text
//                   style={{
//                     color: theme.textPrimary,
//                     fontSize: 20,
//                     fontWeight: '600',
//                     marginBottom: 6,
//                   }}>
//                   Recreate This Look
//                 </Text>

//                 {/* Tags */}
//                 {selectedLook.tags && selectedLook.tags.length > 0 ? (
//                   <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
//                     {selectedLook.tags.map(t => (
//                       <View
//                         key={t}
//                         style={{
//                           backgroundColor: theme.surface2,
//                           paddingHorizontal: 10,
//                           paddingVertical: 4,
//                           borderRadius: 12,
//                           marginRight: 6,
//                           marginBottom: 6,
//                         }}>
//                         <Text style={{color: theme.textSecondary}}>#{t}</Text>
//                       </View>
//                     ))}
//                   </View>
//                 ) : (
//                   <Text
//                     style={{
//                       color: theme.textSecondary,
//                       fontSize: 14,
//                       marginTop: 4,
//                     }}>
//                     AI is analyzing this look...
//                   </Text>
//                 )}

//                 {/* Build Look button */}
//                 <TouchableOpacity
//                   activeOpacity={0.9}
//                   style={{
//                     marginTop: tokens.spacing.md,
//                     backgroundColor: theme.accent,
//                     paddingVertical: 14,
//                     borderRadius: tokens.borderRadius.xl,
//                     alignItems: 'center',
//                     opacity: recreating ? 0.7 : 1,
//                   }}
//                   disabled={recreating}
//                   onPress={handleRecreate}>
//                   {recreating ? (
//                     <ActivityIndicator color="white" />
//                   ) : (
//                     <Text
//                       style={{
//                         color: 'white',
//                         fontWeight: '600',
//                         fontSize: 16,
//                       }}>
//                       Build This Look
//                     </Text>
//                   )}
//                 </TouchableOpacity>
//               </View>

//               <AppleTouchFeedback onPress={closeLook}>
//                 <View
//                   style={{
//                     position: 'absolute',
//                     top: 20,
//                     right: 20,
//                     backgroundColor: 'rgba(0,0,0,0.45)',
//                     borderRadius: 30,
//                     padding: 6,
//                   }}>
//                   <MaterialIcons name="close" size={26} color="white" />
//                 </View>
//               </AppleTouchFeedback>
//             </Animatable.View>
//           </View>
//         )}
//       </Modal>
//     </View>
//   );
// }
