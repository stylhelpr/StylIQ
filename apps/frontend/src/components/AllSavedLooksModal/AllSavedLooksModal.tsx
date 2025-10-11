/* eslint-disable react-native/no-inline-styles */
import React, {useRef, useEffect, useState} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {BlurView} from '@react-native-community/blur';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

const {height} = Dimensions.get('window');

export default function AllSavedLooksModal({
  visible,
  onClose,
  savedLooks,
  recreateLook,
  openShopModal,
  shopResults, // ✅ add this
}: {
  visible: boolean;
  onClose: () => void;
  savedLooks: any[];
  recreateLook?: (params: {
    image_url: string;
    tags?: string[];
  }) => Promise<void> | void;
  openShopModal?: (tags?: string[]) => void;
  shopResults?: any[]; // ✅ new prop
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const {theme} = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [showShop, setShowShop] = useState(false);
  // const [shopResults, setShopResults] = useState<any[]>([]);
  const [shopLoading, setShopLoading] = useState(false);

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    panel: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.5,
      shadowRadius: 24,
      shadowOffset: {width: 0, height: -8},
      elevation: 20,
    },
    closeIcon: {
      position: 'absolute',
      top: 0,
      right: 20,
      zIndex: 20,
      backgroundColor: 'black',
      borderRadius: 20,
      padding: 6,
    },
    gestureZone: {
      position: 'absolute',
      top: 56,
      height: 80,
      width: '100%',
      zIndex: 10,
      backgroundColor: 'transparent',
    },
    header: {
      marginTop: 35,
      height: 56,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      borderBottomColor: 'rgba(255,255,255,0.08)',
      borderBottomWidth: StyleSheet.hairlineWidth,
      zIndex: 5,
    },
    title: {
      color: theme.colors.foreground,
      fontWeight: '800',
      fontSize: 17,
      flex: 1,
      textAlign: 'left',
    },
  });

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) {
        translateY.setValue(0);
        onClose();
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 100 || g.vy > 0.3) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  if (!visible) return null;

  const handleRecreatePress = async (look: any) => {
    if (!recreateLook) return;
    try {
      setLoading(true);
      await recreateLook({
        image_url: look.image_url,
        tags: look.tags,
      });
    } catch (e) {
      console.error('[AllSavedLooksModal] recreateLook failed:', e);
    } finally {
      setLoading(false);
    }
  };

  // const handleShopPress = async (look: any) => {
  //   if (!openShopModal) return;
  //   try {
  //     setShopLoading(true);

  //     // 🧠 Build a richer, cleaner tag set
  //     const baseTags =
  //       look.tags && look.tags.length > 0
  //         ? look.tags
  //         : ['outfit', 'fashion', 'style'];

  //     // 🧩 Inject extra context if available
  //     const enrichedTags = [
  //       ...(baseTags || []),
  //       look.gender || look.gender_presentation || 'men',
  //       look.mainCategory || '',
  //       look.subCategory || '',
  //       look.style_type || '',
  //       look.occasion || '',
  //     ]
  //       .map(t => t?.toString().toLowerCase().trim())
  //       .filter(
  //         (t, i, arr) =>
  //           !!t &&
  //           !['outfit', 'fashion', 'style', 'clothes'].includes(t) &&
  //           arr.indexOf(t) === i,
  //       );

  //     // 🪞 Default fallback if tags are empty or nonsense
  //     const finalTags =
  //       enrichedTags.length > 0 ? enrichedTags : ['men', 'tailored', 'classic'];

  //     console.log('[AllSavedLooksModal] Enriched shop tags →', finalTags);

  //     // 🛍 Fetch results using enriched tags
  //     // 🧠 Compose a more descriptive natural query for the AI / search API
  //     const query = [
  //       finalTags.join(' '),
  //       'men fashion outfit',
  //       look.mainCategory ? look.mainCategory : '',
  //       look.subCategory ? look.subCategory : '',
  //       look.style_type ? `${look.style_type} style` : '',
  //       look.occasion ? `${look.occasion} outfit` : '',
  //     ]
  //       .filter(Boolean)
  //       .join(' ')
  //       .trim();

  //     console.log('[AllSavedLooksModal] Final shop query →', query);

  //     // 🛍 Fetch results using this natural query string
  //     const results = await openShopModal(query.split(' '));

  //     // ✅ Sync results locally if array
  //     if (Array.isArray(results)) {
  //       setShopResults(results);
  //     }

  //     setShowShop(true);
  //   } catch (err) {
  //     console.error('[AllSavedLooksModal] shop modal failed:', err);
  //   } finally {
  //     setShopLoading(false);
  //   }
  // };

  // const handleShopPress = async (look: any) => {
  //   if (!openShopModal) return;
  //   try {
  //     setShopLoading(true);

  //     // 🧠 Build a rich, descriptive search query
  //     const words: string[] = [];

  //     // Gender first
  //     if (look.gender || look.gender_presentation)
  //       words.push((look.gender || look.gender_presentation).toLowerCase());
  //     else words.push('men'); // fallback

  //     // Categories and style descriptors
  //     if (look.mainCategory) words.push(look.mainCategory.toLowerCase());
  //     if (look.subCategory) words.push(look.subCategory.toLowerCase());
  //     if (look.style_type) words.push(look.style_type.toLowerCase());
  //     if (look.occasion) words.push(look.occasion.toLowerCase());
  //     if (look.seasonality) words.push(look.seasonality.toLowerCase());
  //     if (look.pattern) words.push(look.pattern.toLowerCase());
  //     if (look.color) words.push(look.color.toLowerCase());
  //     if (look.fit) words.push(look.fit.toLowerCase());

  //     // Tags — but only if unique and meaningful
  //     if (Array.isArray(look.tags)) {
  //       for (const tag of look.tags) {
  //         if (
  //           tag &&
  //           !['outfit', 'style', 'fashion', 'clothing'].includes(
  //             tag.toLowerCase(),
  //           )
  //         ) {
  //           words.push(tag.toLowerCase());
  //         }
  //       }
  //     }

  //     // 🪄 Clean and build final query string
  //     const query = Array.from(new Set(words)).filter(Boolean).join(' ').trim();

  //     console.log('[AllSavedLooksModal] Final shop query →', query);

  //     const results = await openShopModal([query]);

  //     if (Array.isArray(results)) {
  //       setShopResults(results);
  //       setShowShop(true);
  //     }
  //   } catch (err) {
  //     console.error('[AllSavedLooksModal] shop modal failed:', err);
  //   } finally {
  //     setShopLoading(false);
  //   }
  // };

  // const handleShopPress = async (look: any) => {
  //   if (!openShopModal) return;
  //   try {
  //     setShopLoading(true);

  //     const words: string[] = [];
  //     if (look.gender || look.gender_presentation)
  //       words.push((look.gender || look.gender_presentation).toLowerCase());
  //     else words.push('men');
  //     if (look.mainCategory) words.push(look.mainCategory.toLowerCase());
  //     if (look.subCategory) words.push(look.subCategory.toLowerCase());
  //     if (look.style_type) words.push(look.style_type.toLowerCase());
  //     if (look.occasion) words.push(look.occasion.toLowerCase());
  //     if (look.seasonality) words.push(look.seasonality.toLowerCase());
  //     if (look.pattern) words.push(look.pattern.toLowerCase());
  //     if (look.color) words.push(look.color.toLowerCase());
  //     if (look.fit) words.push(look.fit.toLowerCase());
  //     if (Array.isArray(look.tags)) {
  //       for (const tag of look.tags) {
  //         if (
  //           tag &&
  //           !['outfit', 'style', 'fashion', 'clothing'].includes(
  //             tag.toLowerCase(),
  //           )
  //         ) {
  //           words.push(tag.toLowerCase());
  //         }
  //       }
  //     }

  //     const query = Array.from(new Set(words)).filter(Boolean).join(' ').trim();
  //     console.log('[AllSavedLooksModal] Final shop query →', query);

  //     // ✅ close this modal and trigger parent’s ShopModal
  //     onClose(); // close AllSavedLooksModal
  //     await openShopModal?.([query]); // parent will handle setting shopVisible = true
  //   } catch (err) {
  //     console.error('[AllSavedLooksModal] shop modal failed:', err);
  //   } finally {
  //     setShopLoading(false);
  //   }
  // };

  // const handleShopPress = async (look: any) => {
  //   if (!openShopModal) return;
  //   try {
  //     setShopLoading(true);

  //     // 🧠 Build query from existing look metadata
  //     const words: string[] = [];

  //     // Include gender
  //     const gender = (
  //       look.gender ||
  //       look.gender_presentation ||
  //       'men'
  //     ).toLowerCase();
  //     words.push(gender);

  //     // Use AI / saved tags if present
  //     if (Array.isArray(look.tags) && look.tags.length > 0) {
  //       for (const tag of look.tags) {
  //         if (
  //           tag &&
  //           !['outfit', 'style', 'fashion', 'clothing'].includes(
  //             tag.toLowerCase(),
  //           )
  //         ) {
  //           words.push(tag.toLowerCase());
  //         }
  //       }
  //     }

  //     // Use other descriptive props (if exist)
  //     const enrichKeys = [
  //       'mainCategory',
  //       'subCategory',
  //       'style_type',
  //       'occasion',
  //       'seasonality',
  //       'pattern',
  //       'color',
  //       'fit',
  //     ];

  //     for (const key of enrichKeys) {
  //       if (look[key]) words.push(String(look[key]).toLowerCase());
  //     }

  //     // 🪄 Final query — force fallback if still too minimal
  //     let query = Array.from(new Set(words)).filter(Boolean).join(' ').trim();
  //     if (query.split(' ').length < 3) {
  //       query = `${gender} ${look.tags?.join(' ') || 'outfit neutral modern'}`;
  //     }

  //     console.log('[AllSavedLooksModal] Final shop query →', query);

  //     // ✅ Close modal and call ShopModal with real descriptive query
  //     onClose();
  //     await openShopModal?.([query]);
  //   } catch (err) {
  //     console.error('[AllSavedLooksModal] shop modal failed:', err);
  //   } finally {
  //     setShopLoading(false);
  //   }
  // };

  const handleShopPress = async (look: any) => {
    if (!openShopModal) return;
    try {
      setShopLoading(true);

      // 🧠 Build query from existing look metadata
      const words: string[] = [];

      // Include gender
      const gender = (
        look.gender ||
        look.gender_presentation ||
        'men'
      ).toLowerCase();
      words.push(gender);

      // Use AI / saved tags if present
      if (Array.isArray(look.tags) && look.tags.length > 0) {
        for (const tag of look.tags) {
          if (
            tag &&
            !['outfit', 'style', 'fashion', 'clothing'].includes(
              tag.toLowerCase(),
            )
          ) {
            words.push(tag.toLowerCase());
          }
        }
      }

      // Add descriptive props (if exist)
      const enrichKeys = [
        'mainCategory',
        'subCategory',
        'style_type',
        'occasion',
        'seasonality',
        'pattern',
        'color',
        'fit',
      ];

      for (const key of enrichKeys) {
        if (look[key]) words.push(String(look[key]).toLowerCase());
      }

      // 🪄 Build and sanitize
      let query = Array.from(new Set(words)).filter(Boolean).join(' ').trim();

      // 🧩 Smarter fallback: infer context from known category hints
      if (query.split(' ').length < 3) {
        let inferredType = 'outfit';
        if (look.mainCategory?.toLowerCase().includes('top'))
          inferredType = 'shirt';
        else if (look.mainCategory?.toLowerCase().includes('bottom'))
          inferredType = 'trousers';
        else if (look.mainCategory?.toLowerCase().includes('outerwear'))
          inferredType = 'jacket';
        else if (look.mainCategory?.toLowerCase().includes('shoe'))
          inferredType = 'sneakers';
        else if (look.subCategory?.toLowerCase().includes('coat'))
          inferredType = 'coat';
        else if (look.subCategory?.toLowerCase().includes('short'))
          inferredType = 'shorts';

        // include style fallback
        query = `${gender} ${inferredType} ${look.color || ''} ${
          look.fit || ''
        } ${look.tags?.join(' ') || 'neutral modern'}`.trim();
      }

      console.log('[AllSavedLooksModal] Final shop query →', query);

      // ✅ Close modal and trigger ShopModal
      onClose();
      await openShopModal?.([query]);
    } catch (err) {
      console.error('[AllSavedLooksModal] shop modal failed:', err);
    } finally {
      setShopLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.modalContainer} pointerEvents="box-none">
        <Animatable.View
          animation="fadeIn"
          duration={300}
          style={styles.backdrop}
        />

        <Animated.View
          style={[
            styles.panel,
            {transform: [{translateY}], width: '100%', height: '100%'},
          ]}
          pointerEvents="box-none">
          <TouchableOpacity
            style={styles.closeIcon}
            onPress={handleClose}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <MaterialIcons
              name="close"
              size={22}
              color={theme.colors.buttonText1}
            />
          </TouchableOpacity>

          <View
            {...panResponder.panHandlers}
            pointerEvents="box-only"
            style={styles.gestureZone}
          />

          <BlurView
            style={styles.header}
            blurType="dark"
            blurAmount={20}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
            <Text numberOfLines={1} style={styles.title}>
              All Saved Looks
            </Text>
          </BlurView>

          <Animatable.View
            animation="fadeIn"
            delay={250}
            duration={800}
            style={{flex: 1}}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingBottom: 80,
              }}>
              {savedLooks.map((look, index) => (
                <Animatable.View
                  key={look.id || index}
                  animation="fadeInUp"
                  delay={index * 50}
                  useNativeDriver
                  style={{
                    width: '48%',
                    marginBottom: 12,
                    borderRadius: tokens.borderRadius.md,
                    overflow: 'hidden',
                    backgroundColor: theme.colors.surface,
                  }}>
                  <Image
                    source={{uri: look.image_url}}
                    style={{width: '100%', height: 180}}
                    resizeMode="cover"
                  />

                  {look.tags?.length > 0 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        paddingHorizontal: 8,
                        marginTop: 4,
                      }}>
                      {look.tags.map((t, i) => (
                        <View
                          key={`${t}-${i}`}
                          style={{
                            backgroundColor: theme.colors.surface2,
                            borderRadius: 10,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            margin: 2,
                          }}>
                          <Text
                            style={{
                              color: theme.colors.foreground,
                              fontSize: 11,
                            }}>
                            #{t}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingHorizontal: 8,
                      paddingVertical: 8,
                    }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium');
                        handleRecreatePress(look);
                      }}
                      disabled={loading}
                      style={{
                        backgroundColor: theme.colors.button1,
                        borderRadius: tokens.borderRadius.md,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        opacity: loading ? 0.5 : 1,
                      }}>
                      <Text
                        style={{
                          color: 'white',
                          fontWeight: '600',
                          fontSize: 12,
                        }}>
                        {loading ? 'Recreate' : 'Recreate'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium');
                        handleShopPress(look);
                      }}
                      style={{
                        backgroundColor: theme.colors.surface3,
                        borderRadius: tokens.borderRadius.md,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        marginLeft: 8,
                      }}>
                      <Text
                        style={{
                          color: theme.colors.foreground,
                          fontWeight: '600',
                          fontSize: 12,
                        }}>
                        Shop the vibe
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={{
                      paddingHorizontal: 8,
                      paddingBottom: 10,
                      color: theme.colors.foreground,
                      fontWeight: '600',
                      fontSize: 13,
                    }}
                    numberOfLines={1}>
                    {look.name || 'Unnamed Look'}
                  </Text>
                </Animatable.View>
              ))}
            </ScrollView>
          </Animatable.View>

          {/* 🌀 Recreate Spinner */}
          {loading && (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'rgba(0,0,0,0.4)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 999,
              }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={{
                  color: theme.colors.foreground,
                  marginTop: 12,
                  fontWeight: '600',
                }}>
                Recreating your look...
              </Text>
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef, useEffect, useState} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   Animated,
//   Dimensions,
//   PanResponder,
//   TouchableOpacity,
//   ScrollView,
//   Image,
//   ActivityIndicator,
//   Linking,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {BlurView} from '@react-native-community/blur';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

// const {height} = Dimensions.get('window');

// export default function AllSavedLooksModal({
//   visible,
//   onClose,
//   savedLooks,
//   recreateLook,
//   openShopModal,
//   shopResults, // ✅ add this
// }: {
//   visible: boolean;
//   onClose: () => void;
//   savedLooks: any[];
//   recreateLook?: (params: {
//     image_url: string;
//     tags?: string[];
//   }) => Promise<void> | void;
//   openShopModal?: (tags?: string[]) => void;
//   shopResults?: any[]; // ✅ new prop
// }) {
//   const translateY = useRef(new Animated.Value(0)).current;
//   const {theme} = useAppTheme();
//   const [loading, setLoading] = useState(false);
//   const [showShop, setShowShop] = useState(false);
//   // const [shopResults, setShopResults] = useState<any[]>([]);
//   const [shopLoading, setShopLoading] = useState(false);

//   const styles = StyleSheet.create({
//     modalContainer: {
//       flex: 1,
//       backgroundColor: 'transparent',
//       justifyContent: 'flex-end',
//     },
//     backdrop: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0,0,0,0.7)',
//     },
//     panel: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       borderTopLeftRadius: 24,
//       borderTopRightRadius: 24,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.5,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: -8},
//       elevation: 20,
//     },
//     closeIcon: {
//       position: 'absolute',
//       top: 0,
//       right: 20,
//       zIndex: 20,
//       backgroundColor: 'black',
//       borderRadius: 20,
//       padding: 6,
//     },
//     gestureZone: {
//       position: 'absolute',
//       top: 56,
//       height: 80,
//       width: '100%',
//       zIndex: 10,
//       backgroundColor: 'transparent',
//     },
//     header: {
//       marginTop: 35,
//       height: 56,
//       alignItems: 'center',
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       borderBottomColor: 'rgba(255,255,255,0.08)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       zIndex: 5,
//     },
//     title: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 17,
//       flex: 1,
//       textAlign: 'left',
//     },
//   });

//   useEffect(() => {
//     if (visible) translateY.setValue(0);
//   }, [visible, translateY]);

//   const handleClose = () => {
//     Animated.timing(translateY, {
//       toValue: height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         translateY.setValue(0);
//         onClose();
//       }
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderMove: (_e, g) => {
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         } else {
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   if (!visible) return null;

//   const handleRecreatePress = async (look: any) => {
//     if (!recreateLook) return;
//     try {
//       setLoading(true);
//       await recreateLook({
//         image_url: look.image_url,
//         tags: look.tags,
//       });
//     } catch (e) {
//       console.error('[AllSavedLooksModal] recreateLook failed:', e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // const handleShopPress = async (look: any) => {
//   //   if (!openShopModal) return;
//   //   try {
//   //     setShopLoading(true);

//   //     // 🧠 Build a richer, cleaner tag set
//   //     const baseTags =
//   //       look.tags && look.tags.length > 0
//   //         ? look.tags
//   //         : ['outfit', 'fashion', 'style'];

//   //     // 🧩 Inject extra context if available
//   //     const enrichedTags = [
//   //       ...(baseTags || []),
//   //       look.gender || look.gender_presentation || 'men',
//   //       look.mainCategory || '',
//   //       look.subCategory || '',
//   //       look.style_type || '',
//   //       look.occasion || '',
//   //     ]
//   //       .map(t => t?.toString().toLowerCase().trim())
//   //       .filter(
//   //         (t, i, arr) =>
//   //           !!t &&
//   //           !['outfit', 'fashion', 'style', 'clothes'].includes(t) &&
//   //           arr.indexOf(t) === i,
//   //       );

//   //     // 🪞 Default fallback if tags are empty or nonsense
//   //     const finalTags =
//   //       enrichedTags.length > 0 ? enrichedTags : ['men', 'tailored', 'classic'];

//   //     console.log('[AllSavedLooksModal] Enriched shop tags →', finalTags);

//   //     // 🛍 Fetch results using enriched tags
//   //     // 🧠 Compose a more descriptive natural query for the AI / search API
//   //     const query = [
//   //       finalTags.join(' '),
//   //       'men fashion outfit',
//   //       look.mainCategory ? look.mainCategory : '',
//   //       look.subCategory ? look.subCategory : '',
//   //       look.style_type ? `${look.style_type} style` : '',
//   //       look.occasion ? `${look.occasion} outfit` : '',
//   //     ]
//   //       .filter(Boolean)
//   //       .join(' ')
//   //       .trim();

//   //     console.log('[AllSavedLooksModal] Final shop query →', query);

//   //     // 🛍 Fetch results using this natural query string
//   //     const results = await openShopModal(query.split(' '));

//   //     // ✅ Sync results locally if array
//   //     if (Array.isArray(results)) {
//   //       setShopResults(results);
//   //     }

//   //     setShowShop(true);
//   //   } catch (err) {
//   //     console.error('[AllSavedLooksModal] shop modal failed:', err);
//   //   } finally {
//   //     setShopLoading(false);
//   //   }
//   // };

//   // const handleShopPress = async (look: any) => {
//   //   if (!openShopModal) return;
//   //   try {
//   //     setShopLoading(true);

//   //     // 🧠 Build a rich, descriptive search query
//   //     const words: string[] = [];

//   //     // Gender first
//   //     if (look.gender || look.gender_presentation)
//   //       words.push((look.gender || look.gender_presentation).toLowerCase());
//   //     else words.push('men'); // fallback

//   //     // Categories and style descriptors
//   //     if (look.mainCategory) words.push(look.mainCategory.toLowerCase());
//   //     if (look.subCategory) words.push(look.subCategory.toLowerCase());
//   //     if (look.style_type) words.push(look.style_type.toLowerCase());
//   //     if (look.occasion) words.push(look.occasion.toLowerCase());
//   //     if (look.seasonality) words.push(look.seasonality.toLowerCase());
//   //     if (look.pattern) words.push(look.pattern.toLowerCase());
//   //     if (look.color) words.push(look.color.toLowerCase());
//   //     if (look.fit) words.push(look.fit.toLowerCase());

//   //     // Tags — but only if unique and meaningful
//   //     if (Array.isArray(look.tags)) {
//   //       for (const tag of look.tags) {
//   //         if (
//   //           tag &&
//   //           !['outfit', 'style', 'fashion', 'clothing'].includes(
//   //             tag.toLowerCase(),
//   //           )
//   //         ) {
//   //           words.push(tag.toLowerCase());
//   //         }
//   //       }
//   //     }

//   //     // 🪄 Clean and build final query string
//   //     const query = Array.from(new Set(words)).filter(Boolean).join(' ').trim();

//   //     console.log('[AllSavedLooksModal] Final shop query →', query);

//   //     const results = await openShopModal([query]);

//   //     if (Array.isArray(results)) {
//   //       setShopResults(results);
//   //       setShowShop(true);
//   //     }
//   //   } catch (err) {
//   //     console.error('[AllSavedLooksModal] shop modal failed:', err);
//   //   } finally {
//   //     setShopLoading(false);
//   //   }
//   // };

//   // const handleShopPress = async (look: any) => {
//   //   if (!openShopModal) return;
//   //   try {
//   //     setShopLoading(true);

//   //     const words: string[] = [];
//   //     if (look.gender || look.gender_presentation)
//   //       words.push((look.gender || look.gender_presentation).toLowerCase());
//   //     else words.push('men');
//   //     if (look.mainCategory) words.push(look.mainCategory.toLowerCase());
//   //     if (look.subCategory) words.push(look.subCategory.toLowerCase());
//   //     if (look.style_type) words.push(look.style_type.toLowerCase());
//   //     if (look.occasion) words.push(look.occasion.toLowerCase());
//   //     if (look.seasonality) words.push(look.seasonality.toLowerCase());
//   //     if (look.pattern) words.push(look.pattern.toLowerCase());
//   //     if (look.color) words.push(look.color.toLowerCase());
//   //     if (look.fit) words.push(look.fit.toLowerCase());
//   //     if (Array.isArray(look.tags)) {
//   //       for (const tag of look.tags) {
//   //         if (
//   //           tag &&
//   //           !['outfit', 'style', 'fashion', 'clothing'].includes(
//   //             tag.toLowerCase(),
//   //           )
//   //         ) {
//   //           words.push(tag.toLowerCase());
//   //         }
//   //       }
//   //     }

//   //     const query = Array.from(new Set(words)).filter(Boolean).join(' ').trim();
//   //     console.log('[AllSavedLooksModal] Final shop query →', query);

//   //     // ✅ close this modal and trigger parent’s ShopModal
//   //     onClose(); // close AllSavedLooksModal
//   //     await openShopModal?.([query]); // parent will handle setting shopVisible = true
//   //   } catch (err) {
//   //     console.error('[AllSavedLooksModal] shop modal failed:', err);
//   //   } finally {
//   //     setShopLoading(false);
//   //   }
//   // };

//   const handleShopPress = async (look: any) => {
//     if (!openShopModal) return;
//     try {
//       setShopLoading(true);

//       // 🧠 Build query from existing look metadata
//       const words: string[] = [];

//       // Include gender
//       const gender = (
//         look.gender ||
//         look.gender_presentation ||
//         'men'
//       ).toLowerCase();
//       words.push(gender);

//       // Use AI / saved tags if present
//       if (Array.isArray(look.tags) && look.tags.length > 0) {
//         for (const tag of look.tags) {
//           if (
//             tag &&
//             !['outfit', 'style', 'fashion', 'clothing'].includes(
//               tag.toLowerCase(),
//             )
//           ) {
//             words.push(tag.toLowerCase());
//           }
//         }
//       }

//       // Use other descriptive props (if exist)
//       const enrichKeys = [
//         'mainCategory',
//         'subCategory',
//         'style_type',
//         'occasion',
//         'seasonality',
//         'pattern',
//         'color',
//         'fit',
//       ];

//       for (const key of enrichKeys) {
//         if (look[key]) words.push(String(look[key]).toLowerCase());
//       }

//       // 🪄 Final query — force fallback if still too minimal
//       let query = Array.from(new Set(words)).filter(Boolean).join(' ').trim();
//       if (query.split(' ').length < 3) {
//         query = `${gender} ${look.tags?.join(' ') || 'outfit neutral modern'}`;
//       }

//       console.log('[AllSavedLooksModal] Final shop query →', query);

//       // ✅ Close modal and call ShopModal with real descriptive query
//       onClose();
//       await openShopModal?.([query]);
//     } catch (err) {
//       console.error('[AllSavedLooksModal] shop modal failed:', err);
//     } finally {
//       setShopLoading(false);
//     }
//   };

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       presentationStyle="overFullScreen"
//       onRequestClose={handleClose}>
//       <SafeAreaView style={styles.modalContainer} pointerEvents="box-none">
//         <Animatable.View
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />

//         <Animated.View
//           style={[
//             styles.panel,
//             {transform: [{translateY}], width: '100%', height: '100%'},
//           ]}
//           pointerEvents="box-none">
//           <TouchableOpacity
//             style={styles.closeIcon}
//             onPress={handleClose}
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </TouchableOpacity>

//           <View
//             {...panResponder.panHandlers}
//             pointerEvents="box-only"
//             style={styles.gestureZone}
//           />

//           <BlurView
//             style={styles.header}
//             blurType="dark"
//             blurAmount={20}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Text numberOfLines={1} style={styles.title}>
//               All Saved Looks
//             </Text>
//           </BlurView>

//           <Animatable.View
//             animation="fadeIn"
//             delay={250}
//             duration={800}
//             style={{flex: 1}}>
//             <ScrollView
//               showsVerticalScrollIndicator={false}
//               contentContainerStyle={{
//                 flexDirection: 'row',
//                 flexWrap: 'wrap',
//                 justifyContent: 'space-between',
//                 paddingHorizontal: 12,
//                 paddingBottom: 80,
//               }}>
//               {savedLooks.map((look, index) => (
//                 <Animatable.View
//                   key={look.id || index}
//                   animation="fadeInUp"
//                   delay={index * 50}
//                   useNativeDriver
//                   style={{
//                     width: '48%',
//                     marginBottom: 12,
//                     borderRadius: tokens.borderRadius.md,
//                     overflow: 'hidden',
//                     backgroundColor: theme.colors.surface,
//                   }}>
//                   <Image
//                     source={{uri: look.image_url}}
//                     style={{width: '100%', height: 180}}
//                     resizeMode="cover"
//                   />

//                   {look.tags?.length > 0 && (
//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         paddingHorizontal: 8,
//                         marginTop: 4,
//                       }}>
//                       {look.tags.map((t, i) => (
//                         <View
//                           key={`${t}-${i}`}
//                           style={{
//                             backgroundColor: theme.colors.surface2,
//                             borderRadius: 10,
//                             paddingHorizontal: 8,
//                             paddingVertical: 2,
//                             margin: 2,
//                           }}>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontSize: 11,
//                             }}>
//                             #{t}
//                           </Text>
//                         </View>
//                       ))}
//                     </View>
//                   )}

//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       justifyContent: 'space-between',
//                       paddingHorizontal: 8,
//                       paddingVertical: 8,
//                     }}>
//                     <TouchableOpacity
//                       activeOpacity={0.8}
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactMedium');
//                         handleRecreatePress(look);
//                       }}
//                       disabled={loading}
//                       style={{
//                         backgroundColor: theme.colors.button1,
//                         borderRadius: tokens.borderRadius.md,
//                         paddingVertical: 6,
//                         paddingHorizontal: 12,
//                         opacity: loading ? 0.5 : 1,
//                       }}>
//                       <Text
//                         style={{
//                           color: 'white',
//                           fontWeight: '600',
//                           fontSize: 12,
//                         }}>
//                         {loading ? 'Recreate' : 'Recreate'}
//                       </Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       activeOpacity={0.8}
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactMedium');
//                         handleShopPress(look);
//                       }}
//                       style={{
//                         backgroundColor: theme.colors.surface3,
//                         borderRadius: tokens.borderRadius.md,
//                         paddingVertical: 6,
//                         paddingHorizontal: 12,
//                         marginLeft: 8,
//                       }}>
//                       <Text
//                         style={{
//                           color: theme.colors.foreground,
//                           fontWeight: '600',
//                           fontSize: 12,
//                         }}>
//                         Shop the vibe
//                       </Text>
//                     </TouchableOpacity>
//                   </View>

//                   <Text
//                     style={{
//                       paddingHorizontal: 8,
//                       paddingBottom: 10,
//                       color: theme.colors.foreground,
//                       fontWeight: '600',
//                       fontSize: 13,
//                     }}
//                     numberOfLines={1}>
//                     {look.name || 'Unnamed Look'}
//                   </Text>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           </Animatable.View>

//           {/* 🌀 Recreate Spinner */}
//           {loading && (
//             <View
//               style={{
//                 ...StyleSheet.absoluteFillObject,
//                 backgroundColor: 'rgba(0,0,0,0.4)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 zIndex: 999,
//               }}>
//               <ActivityIndicator size="large" color={theme.colors.primary} />
//               <Text
//                 style={{
//                   color: theme.colors.foreground,
//                   marginTop: 12,
//                   fontWeight: '600',
//                 }}>
//                 Recreating your look...
//               </Text>
//             </View>
//           )}
//         </Animated.View>
//       </SafeAreaView>
//     </Modal>
//   );
// }

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef, useEffect, useState} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   Animated,
//   Dimensions,
//   PanResponder,
//   TouchableOpacity,
//   ScrollView,
//   Image,
//   ActivityIndicator,
//   Linking,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {BlurView} from '@react-native-community/blur';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// const {height} = Dimensions.get('window');

// export default function AllSavedLooksModal({
//   visible,
//   onClose,
//   savedLooks,
//   recreateLook,
//   openShopModal,
//   shopResults, // ✅ add this
// }: {
//   visible: boolean;
//   onClose: () => void;
//   savedLooks: any[];
//   recreateLook?: (params: {
//     image_url: string;
//     tags?: string[];
//   }) => Promise<void> | void;
//   openShopModal?: (tags?: string[]) => void;
//   shopResults?: any[]; // ✅ new prop
// }) {
//   const translateY = useRef(new Animated.Value(0)).current;
//   const {theme} = useAppTheme();
//   const [loading, setLoading] = useState(false);
//   const [showShop, setShowShop] = useState(false);
//   // const [shopResults, setShopResults] = useState<any[]>([]);
//   const [shopLoading, setShopLoading] = useState(false);

//   const styles = StyleSheet.create({
//     modalContainer: {
//       flex: 1,
//       backgroundColor: 'transparent',
//       justifyContent: 'flex-end',
//     },
//     backdrop: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0,0,0,0.7)',
//     },
//     panel: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       borderTopLeftRadius: 24,
//       borderTopRightRadius: 24,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.5,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: -8},
//       elevation: 20,
//     },
//     closeIcon: {
//       position: 'absolute',
//       top: 0,
//       right: 20,
//       zIndex: 20,
//       backgroundColor: 'black',
//       borderRadius: 20,
//       padding: 6,
//     },
//     gestureZone: {
//       position: 'absolute',
//       top: 56,
//       height: 80,
//       width: '100%',
//       zIndex: 10,
//       backgroundColor: 'transparent',
//     },
//     header: {
//       marginTop: 35,
//       height: 56,
//       alignItems: 'center',
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       borderBottomColor: 'rgba(255,255,255,0.08)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       zIndex: 5,
//     },
//     title: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 17,
//       flex: 1,
//       textAlign: 'left',
//     },
//   });

//   useEffect(() => {
//     if (visible) translateY.setValue(0);
//   }, [visible, translateY]);

//   const handleClose = () => {
//     Animated.timing(translateY, {
//       toValue: height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         translateY.setValue(0);
//         onClose();
//       }
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderMove: (_e, g) => {
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         } else {
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   if (!visible) return null;

//   const handleRecreatePress = async (look: any) => {
//     if (!recreateLook) return;
//     try {
//       setLoading(true);
//       await recreateLook({
//         image_url: look.image_url,
//         tags: look.tags,
//       });
//     } catch (e) {
//       console.error('[AllSavedLooksModal] recreateLook failed:', e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // const handleShopPress = async (look: any) => {
//   //   if (!openShopModal) return;
//   //   try {
//   //     setShopLoading(true);

//   //     // 🧠 Build a richer, cleaner tag set
//   //     const baseTags =
//   //       look.tags && look.tags.length > 0
//   //         ? look.tags
//   //         : ['outfit', 'fashion', 'style'];

//   //     // 🧩 Inject extra context if available
//   //     const enrichedTags = [
//   //       ...(baseTags || []),
//   //       look.gender || look.gender_presentation || 'men',
//   //       look.mainCategory || '',
//   //       look.subCategory || '',
//   //       look.style_type || '',
//   //       look.occasion || '',
//   //     ]
//   //       .map(t => t?.toString().toLowerCase().trim())
//   //       .filter(
//   //         (t, i, arr) =>
//   //           !!t &&
//   //           !['outfit', 'fashion', 'style', 'clothes'].includes(t) &&
//   //           arr.indexOf(t) === i,
//   //       );

//   //     // 🪞 Default fallback if tags are empty or nonsense
//   //     const finalTags =
//   //       enrichedTags.length > 0 ? enrichedTags : ['men', 'tailored', 'classic'];

//   //     console.log('[AllSavedLooksModal] Enriched shop tags →', finalTags);

//   //     // 🛍 Fetch results using enriched tags
//   //     // 🧠 Compose a more descriptive natural query for the AI / search API
//   //     const query = [
//   //       finalTags.join(' '),
//   //       'men fashion outfit',
//   //       look.mainCategory ? look.mainCategory : '',
//   //       look.subCategory ? look.subCategory : '',
//   //       look.style_type ? `${look.style_type} style` : '',
//   //       look.occasion ? `${look.occasion} outfit` : '',
//   //     ]
//   //       .filter(Boolean)
//   //       .join(' ')
//   //       .trim();

//   //     console.log('[AllSavedLooksModal] Final shop query →', query);

//   //     // 🛍 Fetch results using this natural query string
//   //     const results = await openShopModal(query.split(' '));

//   //     // ✅ Sync results locally if array
//   //     if (Array.isArray(results)) {
//   //       setShopResults(results);
//   //     }

//   //     setShowShop(true);
//   //   } catch (err) {
//   //     console.error('[AllSavedLooksModal] shop modal failed:', err);
//   //   } finally {
//   //     setShopLoading(false);
//   //   }
//   // };

//   // const handleShopPress = async (look: any) => {
//   //   if (!openShopModal) return;
//   //   try {
//   //     setShopLoading(true);

//   //     // 🧠 Build a rich, descriptive search query
//   //     const words: string[] = [];

//   //     // Gender first
//   //     if (look.gender || look.gender_presentation)
//   //       words.push((look.gender || look.gender_presentation).toLowerCase());
//   //     else words.push('men'); // fallback

//   //     // Categories and style descriptors
//   //     if (look.mainCategory) words.push(look.mainCategory.toLowerCase());
//   //     if (look.subCategory) words.push(look.subCategory.toLowerCase());
//   //     if (look.style_type) words.push(look.style_type.toLowerCase());
//   //     if (look.occasion) words.push(look.occasion.toLowerCase());
//   //     if (look.seasonality) words.push(look.seasonality.toLowerCase());
//   //     if (look.pattern) words.push(look.pattern.toLowerCase());
//   //     if (look.color) words.push(look.color.toLowerCase());
//   //     if (look.fit) words.push(look.fit.toLowerCase());

//   //     // Tags — but only if unique and meaningful
//   //     if (Array.isArray(look.tags)) {
//   //       for (const tag of look.tags) {
//   //         if (
//   //           tag &&
//   //           !['outfit', 'style', 'fashion', 'clothing'].includes(
//   //             tag.toLowerCase(),
//   //           )
//   //         ) {
//   //           words.push(tag.toLowerCase());
//   //         }
//   //       }
//   //     }

//   //     // 🪄 Clean and build final query string
//   //     const query = Array.from(new Set(words)).filter(Boolean).join(' ').trim();

//   //     console.log('[AllSavedLooksModal] Final shop query →', query);

//   //     const results = await openShopModal([query]);

//   //     if (Array.isArray(results)) {
//   //       setShopResults(results);
//   //       setShowShop(true);
//   //     }
//   //   } catch (err) {
//   //     console.error('[AllSavedLooksModal] shop modal failed:', err);
//   //   } finally {
//   //     setShopLoading(false);
//   //   }
//   // };

//   const handleShopPress = async (look: any) => {
//     if (!openShopModal) return;
//     try {
//       setShopLoading(true);

//       const words: string[] = [];
//       if (look.gender || look.gender_presentation)
//         words.push((look.gender || look.gender_presentation).toLowerCase());
//       else words.push('men');
//       if (look.mainCategory) words.push(look.mainCategory.toLowerCase());
//       if (look.subCategory) words.push(look.subCategory.toLowerCase());
//       if (look.style_type) words.push(look.style_type.toLowerCase());
//       if (look.occasion) words.push(look.occasion.toLowerCase());
//       if (look.seasonality) words.push(look.seasonality.toLowerCase());
//       if (look.pattern) words.push(look.pattern.toLowerCase());
//       if (look.color) words.push(look.color.toLowerCase());
//       if (look.fit) words.push(look.fit.toLowerCase());
//       if (Array.isArray(look.tags)) {
//         for (const tag of look.tags) {
//           if (
//             tag &&
//             !['outfit', 'style', 'fashion', 'clothing'].includes(
//               tag.toLowerCase(),
//             )
//           ) {
//             words.push(tag.toLowerCase());
//           }
//         }
//       }

//       const query = Array.from(new Set(words)).filter(Boolean).join(' ').trim();
//       console.log('[AllSavedLooksModal] Final shop query →', query);

//       // ✅ close this modal and trigger parent’s ShopModal
//       onClose(); // close AllSavedLooksModal
//       await openShopModal?.([query]); // parent will handle setting shopVisible = true
//     } catch (err) {
//       console.error('[AllSavedLooksModal] shop modal failed:', err);
//     } finally {
//       setShopLoading(false);
//     }
//   };

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       presentationStyle="overFullScreen"
//       onRequestClose={handleClose}>
//       <SafeAreaView style={styles.modalContainer} pointerEvents="box-none">
//         <Animatable.View
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />

//         <Animated.View
//           style={[
//             styles.panel,
//             {transform: [{translateY}], width: '100%', height: '100%'},
//           ]}
//           pointerEvents="box-none">
//           <TouchableOpacity
//             style={styles.closeIcon}
//             onPress={handleClose}
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </TouchableOpacity>

//           <View
//             {...panResponder.panHandlers}
//             pointerEvents="box-only"
//             style={styles.gestureZone}
//           />

//           <BlurView
//             style={styles.header}
//             blurType="dark"
//             blurAmount={20}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Text numberOfLines={1} style={styles.title}>
//               All Saved Looks
//             </Text>
//           </BlurView>

//           <Animatable.View
//             animation="fadeIn"
//             delay={250}
//             duration={800}
//             style={{flex: 1}}>
//             <ScrollView
//               showsVerticalScrollIndicator={false}
//               contentContainerStyle={{
//                 flexDirection: 'row',
//                 flexWrap: 'wrap',
//                 justifyContent: 'space-between',
//                 paddingHorizontal: 12,
//                 paddingBottom: 80,
//               }}>
//               {savedLooks.map((look, index) => (
//                 <Animatable.View
//                   key={look.id || index}
//                   animation="fadeInUp"
//                   delay={index * 50}
//                   useNativeDriver
//                   style={{
//                     width: '48%',
//                     marginBottom: 12,
//                     borderRadius: tokens.borderRadius.md,
//                     overflow: 'hidden',
//                     backgroundColor: theme.colors.surface,
//                   }}>
//                   <Image
//                     source={{uri: look.image_url}}
//                     style={{width: '100%', height: 180}}
//                     resizeMode="cover"
//                   />

//                   {look.tags?.length > 0 && (
//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         paddingHorizontal: 8,
//                         marginTop: 4,
//                       }}>
//                       {look.tags.map((t, i) => (
//                         <View
//                           key={`${t}-${i}`}
//                           style={{
//                             backgroundColor: theme.colors.surface2,
//                             borderRadius: 10,
//                             paddingHorizontal: 8,
//                             paddingVertical: 2,
//                             margin: 2,
//                           }}>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontSize: 11,
//                             }}>
//                             #{t}
//                           </Text>
//                         </View>
//                       ))}
//                     </View>
//                   )}

//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       justifyContent: 'space-between',
//                       paddingHorizontal: 8,
//                       paddingVertical: 8,
//                     }}>
//                     <TouchableOpacity
//                       activeOpacity={0.8}
//                       onPress={() => handleRecreatePress(look)}
//                       disabled={loading}
//                       style={{
//                         backgroundColor: theme.colors.button1,
//                         borderRadius: tokens.borderRadius.md,
//                         paddingVertical: 6,
//                         paddingHorizontal: 12,
//                         opacity: loading ? 0.5 : 1,
//                       }}>
//                       <Text
//                         style={{
//                           color: 'white',
//                           fontWeight: '600',
//                           fontSize: 12,
//                         }}>
//                         {loading ? 'Recreating...' : 'Recreate'}
//                       </Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       activeOpacity={0.8}
//                       onPress={() => handleShopPress(look)}
//                       style={{
//                         backgroundColor: theme.colors.surface3,
//                         borderRadius: tokens.borderRadius.md,
//                         paddingVertical: 6,
//                         paddingHorizontal: 12,
//                       }}>
//                       <Text
//                         style={{
//                           color: theme.colors.foreground,
//                           fontWeight: '600',
//                           fontSize: 12,
//                         }}>
//                         Shop the vibe
//                       </Text>
//                     </TouchableOpacity>
//                   </View>

//                   <Text
//                     style={{
//                       paddingHorizontal: 8,
//                       paddingBottom: 10,
//                       color: theme.colors.foreground,
//                       fontWeight: '600',
//                       fontSize: 13,
//                     }}
//                     numberOfLines={1}>
//                     {look.name || 'Unnamed Look'}
//                   </Text>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           </Animatable.View>

//           {/* 🌀 Recreate Spinner */}
//           {loading && (
//             <View
//               style={{
//                 ...StyleSheet.absoluteFillObject,
//                 backgroundColor: 'rgba(0,0,0,0.4)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 zIndex: 999,
//               }}>
//               <ActivityIndicator size="large" color={theme.colors.primary} />
//               <Text
//                 style={{
//                   color: theme.colors.foreground,
//                   marginTop: 12,
//                   fontWeight: '600',
//                 }}>
//                 Recreating your look...
//               </Text>
//             </View>
//           )}
//         </Animated.View>
//       </SafeAreaView>
//     </Modal>
//   );
// }
