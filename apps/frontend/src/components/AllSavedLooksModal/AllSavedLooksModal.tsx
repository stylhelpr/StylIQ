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
import {useAnalyzeLook} from '../../hooks/useAnalyzeLook';
import {useRecreateLook} from '../../hooks/useRecreateLook';
import {useUUID} from '../../context/UUIDContext';
import {API_BASE_URL} from '../../config/api';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const {height} = Dimensions.get('window');

export default function AllSavedLooksModal({
  visible,
  onClose,
  savedLooks,
  recreateLook,
  openShopModal,
  shopResults, // ✅ add this
  openPersonalizedShopModal, // ← add this line
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
  openPersonalizedShopModal?: (data: {
    recreated_outfit?: any[];
    purchases?: any[];
    styleNote?: string;
  }) => void;
}) {
  const uuidContext = useUUID();

  const userId = uuidContext?.uuid || uuidContext; // ✅ works with both string or object
  console.log('[UUIDContext] resolved userId →', userId);

  const {analyzeLook} = useAnalyzeLook();
  const translateY = useRef(new Animated.Value(0)).current;
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const [loading, setLoading] = useState(false);
  const [showShop, setShowShop] = useState(false);
  // const [shopResults, setShopResults] = useState<any[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [successState, setSuccessState] = useState<'recreate' | 'shop' | null>(
    null,
  );

  const insets = useSafeAreaInsets();

  const [personalizedMode, setPersonalizedMode] = useState(false);
  const {
    recreateLook: runRecreate,
    personalizedRecreate,
    loading: recreateLoading,
  } = useRecreateLook();

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
      top: 100, // ⬅️ move it below the header (was 56)
      height: 60, // ⬅️ slightly shorter
      width: '100%',
      zIndex: 2, // ⬅️ lower than header
      backgroundColor: 'transparent',
    },
    header: {
      marginTop: 42,
      height: 50,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
      borderBottomColor: 'rgba(255,255,255,0.08)',
      borderBottomWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.background,
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
    try {
      setLoading(true);

      if (personalizedMode) {
        console.log('💎 Personalized Recreate triggered →', look.image_url);

        const data = await personalizedRecreate({
          user_id: userId,
          image_url: look.image_url,
        });

        console.log('💎 Personalized result:', data);

        setSuccessState('recreate');
        ReactNativeHapticFeedback.trigger('impactMedium');

        if (openPersonalizedShopModal) {
          // ✅ keep backend keys (snake_case)
          openPersonalizedShopModal({
            recreated_outfit: data?.recreated_outfit ?? [],
            suggested_purchases: data?.suggested_purchases ?? [],
            style_note: data?.style_note ?? '',
          });
        } else {
          console.warn('⚠️ No personalized shop modal handler provided.');
        }

        onClose(); // ✅ Close SavedLooksModal
        setTimeout(() => setSuccessState(null), 1200);
        return;
      }

      // -------------------------------
      // 🧥 Standard (Match Image) path
      // -------------------------------
      console.log('🧥 Standard Recreate triggered →', look.image_url);
      ReactNativeHapticFeedback.trigger('impactMedium');

      if (recreateLook) {
        await recreateLook({
          image_url: look.image_url,
          tags: look.tags,
        });
        onClose();
      } else {
        console.warn('⚠️ No recreateLook handler provided.');
      }

      setSuccessState('recreate');
      setTimeout(() => setSuccessState(null), 1200);
    } catch (e) {
      console.error('[AllSavedLooksModal] recreateLook failed:', e);
    } finally {
      console.log('✅ [handleRecreatePress] Loading cleared');
      setLoading(false);
    }
  };

  const handleShopPress = async (look: any) => {
    if (!openShopModal && !openPersonalizedShopModal) return;

    try {
      setShopLoading(true);
      console.log('🟢 [ShopPress] START — image:', look.image_url);

      if (personalizedMode) {
        console.log(
          '🟡 [ShopPress] Personalized mode selected — ignored for Shop flow.',
        );
        // Continue straight to standard match-image path
      }

      // -------------------------------
      // 🧩 MATCH IMAGE PATH (YOUR ORIGINAL)
      // -------------------------------
      // 1) analyze image → aiTags
      const analysis = await analyzeLook(look.image_url);
      const aiTags = analysis?.tags || [];
      console.log('🧠 [ShopPress] AI tags:', aiTags);

      // 2) merge metadata → words[]
      const words: string[] = [];
      if (look.gender || look.gender_presentation)
        words.push((look.gender || look.gender_presentation).toLowerCase());
      else words.push('men');

      if (Array.isArray(aiTags))
        words.push(...aiTags.map(t => t.toLowerCase()));
      if (look.mainCategory) words.push(look.mainCategory.toLowerCase());
      if (look.subCategory) words.push(look.subCategory.toLowerCase());
      if (look.style_type) words.push(look.style_type.toLowerCase());
      if (look.occasion) words.push(look.occasion.toLowerCase());
      if (look.seasonality) words.push(look.seasonality.toLowerCase());
      if (look.pattern) words.push(look.pattern.toLowerCase());
      if (look.color) words.push(look.color.toLowerCase());
      if (look.fit) words.push(look.fit.toLowerCase());

      if (Array.isArray(look.tags)) {
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

      // 3) weighting
      const weighted = words.flatMap(t => {
        const x = t.toLowerCase();
        if (/(flannel|denim|linen|corduroy)/.test(x)) return [x, x, x];
        if (/(plaid|striped|solid|check)/.test(x)) return [x, x];
        if (/(relaxed|tailored|oversized)/.test(x)) return [x, x];
        if (/(autumn|winter|layered)/.test(x)) return [x, x];
        return [x];
      });

      const unique = Array.from(new Set(weighted)).filter(Boolean);
      const query = unique.join(' ').trim();
      console.log('🧩 [ShopPress] Final query:', query);

      // 4) look memory (unchanged)
      console.log('💾 [LookMemory] API_BASE_URL:', API_BASE_URL);
      console.log('💾 [LookMemory] userId:', userId);
      const payload = {
        image_url: look.image_url,
        ai_tags: unique,
        query_used: query,
      };

      if (userId) {
        const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        console.log(
          '💾 [LookMemory] Status:',
          res.status,
          res.statusText,
          text,
        );
        if (!res.ok)
          throw new Error(`Look memory save failed (${res.status}): ${text}`);
      } else {
        console.warn('[LookMemory] No UUID found — skipping look memory save.');
      }

      // 5) success UX + open *your existing* shop modal which expects [query]
      setSuccessState('shop');
      setTimeout(() => setSuccessState(null), 1200);
      setTimeout(async () => {
        onClose();
        await openShopModal?.([query]); // ← unchanged contract for your image-match flow
        setShopLoading(false);
      }, 500);
    } catch (err) {
      console.error('❌ [ShopPress] Error:', err);
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
            {
              transform: [{translateY}],
              width: '100%',
              flexGrow: 1, // ✅ lets content scroll beyond screen height
              flexShrink: 0,
              flexBasis: 'auto',
            },
          ]}
          pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.closeIcon, {marginTop: 6}]}
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
            style={[
              styles.header,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingRight: 16,
              },
            ]}
            blurType="dark"
            blurAmount={20}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
            <Text numberOfLines={1} style={globalStyles.sectionTitle}>
              All Saved Looks
            </Text>

            <View style={{flexDirection: 'row'}}>
              <TouchableOpacity
                onPress={() => setPersonalizedMode(false)}
                activeOpacity={0.8}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  backgroundColor: personalizedMode
                    ? theme.colors.surface2
                    : theme.colors.button1,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.colors.muted,
                }}>
                <Text
                  style={{
                    color: personalizedMode ? theme.colors.foreground : 'white',
                    fontSize: 12,
                    fontWeight: '700',
                  }}>
                  Match Image
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPersonalizedMode(true)}
                activeOpacity={0.8}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  backgroundColor: personalizedMode
                    ? theme.colors.button1
                    : theme.colors.surface2,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.colors.muted,
                }}>
                <Text
                  style={{
                    color: personalizedMode ? 'white' : theme.colors.foreground,
                    fontSize: 12,
                    fontWeight: '700',
                  }}>
                  Personalized
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          <Animatable.View
            animation="fadeIn"
            delay={250}
            duration={800}
            style={{flex: 1}}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentInset={{
                bottom: insets.bottom + (height < 750 ? 520 : 260), // ⬅️ extra space for SE-class screens
              }}
              scrollIndicatorInsets={{
                bottom: insets.bottom + (height < 750 ? 520 : 260),
              }}
              contentContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingBottom: height < 750 ? 520 : 300, // ⬅️ larger scroll buffer for short screens
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
                    borderColor: theme.colors.surfaceBorder,
                    borderWidth: tokens.borderWidth.md,
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

                  {/* BUTTON CONTAINER */}
                  <View
                    style={{
                      paddingHorizontal: 4,
                      paddingVertical: 6,
                    }}>
                    {/* Row 1: Recreate + Shop side-by-side */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          ReactNativeHapticFeedback.trigger('impactMedium');
                          handleRecreatePress(look);
                        }}
                        disabled={loading}
                        style={{
                          flex: 1, // take half row
                          backgroundColor: theme.colors.button1,
                          borderRadius: tokens.borderRadius.md,
                          paddingVertical: 6,
                          marginRight: 6,
                          opacity: loading ? 0.5 : 1,
                          borderWidth: tokens.borderWidth.hairline,
                          borderColor: theme.colors.muted,
                        }}>
                        <Text
                          style={{
                            textAlign: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: 11,
                          }}>
                          Recreate Vibe
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          ReactNativeHapticFeedback.trigger('impactMedium');
                          handleShopPress(look);
                        }}
                        style={{
                          flex: 1, // take other half
                          backgroundColor: theme.colors.surface3,
                          borderRadius: tokens.borderRadius.md,
                          paddingVertical: 6,
                          borderWidth: tokens.borderWidth.hairline,
                          borderColor: theme.colors.muted,
                        }}>
                        <Text
                          style={{
                            textAlign: 'center',
                            color: theme.colors.foreground,
                            fontWeight: '600',
                            fontSize: 11,
                          }}>
                          Shop Vibe
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Row 2: Re-shop full width */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium');
                        openShopModal?.([look.query_used]);
                      }}
                      style={{
                        marginTop: 8,
                        backgroundColor: theme.colors.surface2,
                        borderRadius: tokens.borderRadius.md,
                        paddingVertical: 6,
                        borderWidth: tokens.borderWidth.hairline,
                        borderColor: theme.colors.muted,
                      }}>
                      <Text
                        style={{
                          textAlign: 'center',
                          color: theme.colors.foreground,
                          fontWeight: '600',
                          fontSize: 11,
                        }}>
                        Re-shop This Vibe
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

          {/* ✨ Unified Loading Overlay */}
          {(loading || shopLoading) && (
            <Animatable.View
              animation="fadeIn"
              duration={250}
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 999,
              }}>
              <Animatable.View
                animation="pulse"
                easing="ease-in-out"
                iterationCount="infinite"
                duration={1000}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  borderWidth: 3,
                  borderColor: theme.colors.buttonText1,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <ActivityIndicator
                  size="small"
                  color={theme.colors.buttonText1}
                />
              </Animatable.View>

              <Text
                style={{
                  color: theme.colors.buttonText1,
                  fontWeight: '600',
                  fontSize: 15,
                  marginTop: 20,
                }}>
                {loading
                  ? 'Recreating your vibe. Hang tight...'
                  : 'Finding matching styles...'}
              </Text>
            </Animatable.View>
          )}

          {successState && (
            <Animatable.View
              animation="fadeIn"
              duration={200}
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'rgba(0,0,0,0.6)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
              }}>
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 80,
                  width: 120,
                  height: 120,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: theme.colors.buttonText1,
                }}>
                <MaterialIcons
                  name="check"
                  size={50}
                  color={theme.colors.buttonText1}
                />
              </View>
              <Text
                style={{
                  color: theme.colors.buttonText1,
                  fontWeight: '700',
                  fontSize: 15,
                  marginTop: 18,
                }}>
                {successState === 'recreate'
                  ? 'Vibe recreated!'
                  : 'Styles found!'}
              </Text>
            </Animatable.View>
          )}
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

//////////////////////

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
// import {useAnalyzeLook} from '../../hooks/useAnalyzeLook';
// import {useRecreateLook} from '../../hooks/useRecreateLook';
// import {useUUID} from '../../context/UUIDContext';
// import {API_BASE_URL} from '../../config/api';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// const {height} = Dimensions.get('window');

// export default function AllSavedLooksModal({
//   visible,
//   onClose,
//   savedLooks,
//   recreateLook,
//   openShopModal,
//   shopResults, // ✅ add this
//   openPersonalizedShopModal, // ← add this line
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
//   openPersonalizedShopModal?: (data: {
//     recreated_outfit?: any[];
//     purchases?: any[];
//     styleNote?: string;
//   }) => void;
// }) {
//   const uuidContext = useUUID();

//   const userId = uuidContext?.uuid || uuidContext; // ✅ works with both string or object
//   console.log('[UUIDContext] resolved userId →', userId);

//   const {analyzeLook} = useAnalyzeLook();
//   const translateY = useRef(new Animated.Value(0)).current;
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [loading, setLoading] = useState(false);
//   const [showShop, setShowShop] = useState(false);
//   // const [shopResults, setShopResults] = useState<any[]>([]);
//   const [shopLoading, setShopLoading] = useState(false);
//   const [successState, setSuccessState] = useState<'recreate' | 'shop' | null>(
//     null,
//   );

//   const [personalizedMode, setPersonalizedMode] = useState(false);
//   const {
//     recreateLook: runRecreate,
//     personalizedRecreate,
//     loading: recreateLoading,
//   } = useRecreateLook();

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
//       top: 100, // ⬅️ move it below the header (was 56)
//       height: 60, // ⬅️ slightly shorter
//       width: '100%',
//       zIndex: 2, // ⬅️ lower than header
//       backgroundColor: 'transparent',
//     },
//     header: {
//       marginTop: 42,
//       height: 50,
//       alignItems: 'center',
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       paddingHorizontal: 16,
//       borderBottomColor: 'rgba(255,255,255,0.08)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       backgroundColor: theme.colors.background,
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
//     try {
//       setLoading(true);

//       if (personalizedMode) {
//         console.log('💎 Personalized Recreate triggered →', look.image_url);

//         const data = await personalizedRecreate({
//           user_id: userId,
//           image_url: look.image_url,
//         });

//         console.log('💎 Personalized result:', data);

//         setSuccessState('recreate');
//         ReactNativeHapticFeedback.trigger('impactMedium');

//         if (openPersonalizedShopModal) {
//           // ✅ keep backend keys (snake_case)
//           openPersonalizedShopModal({
//             recreated_outfit: data?.recreated_outfit ?? [],
//             suggested_purchases: data?.suggested_purchases ?? [],
//             style_note: data?.style_note ?? '',
//           });
//         } else {
//           console.warn('⚠️ No personalized shop modal handler provided.');
//         }

//         onClose(); // ✅ Close SavedLooksModal
//         setTimeout(() => setSuccessState(null), 1200);
//         return;
//       }

//       // -------------------------------
//       // 🧥 Standard (Match Image) path
//       // -------------------------------
//       console.log('🧥 Standard Recreate triggered →', look.image_url);
//       ReactNativeHapticFeedback.trigger('impactMedium');

//       if (recreateLook) {
//         await recreateLook({
//           image_url: look.image_url,
//           tags: look.tags,
//         });
//         onClose();
//       } else {
//         console.warn('⚠️ No recreateLook handler provided.');
//       }

//       setSuccessState('recreate');
//       setTimeout(() => setSuccessState(null), 1200);
//     } catch (e) {
//       console.error('[AllSavedLooksModal] recreateLook failed:', e);
//     } finally {
//       console.log('✅ [handleRecreatePress] Loading cleared');
//       setLoading(false);
//     }
//   };

//   const handleShopPress = async (look: any) => {
//     if (!openShopModal && !openPersonalizedShopModal) return;

//     try {
//       setShopLoading(true);
//       console.log('🟢 [ShopPress] START — image:', look.image_url);

//       if (personalizedMode) {
//         console.log(
//           '🟡 [ShopPress] Personalized mode selected — ignored for Shop flow.',
//         );
//         // Continue straight to standard match-image path
//       }

//       // -------------------------------
//       // 🧩 MATCH IMAGE PATH (YOUR ORIGINAL)
//       // -------------------------------
//       // 1) analyze image → aiTags
//       const analysis = await analyzeLook(look.image_url);
//       const aiTags = analysis?.tags || [];
//       console.log('🧠 [ShopPress] AI tags:', aiTags);

//       // 2) merge metadata → words[]
//       const words: string[] = [];
//       if (look.gender || look.gender_presentation)
//         words.push((look.gender || look.gender_presentation).toLowerCase());
//       else words.push('men');

//       if (Array.isArray(aiTags))
//         words.push(...aiTags.map(t => t.toLowerCase()));
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

//       // 3) weighting
//       const weighted = words.flatMap(t => {
//         const x = t.toLowerCase();
//         if (/(flannel|denim|linen|corduroy)/.test(x)) return [x, x, x];
//         if (/(plaid|striped|solid|check)/.test(x)) return [x, x];
//         if (/(relaxed|tailored|oversized)/.test(x)) return [x, x];
//         if (/(autumn|winter|layered)/.test(x)) return [x, x];
//         return [x];
//       });

//       const unique = Array.from(new Set(weighted)).filter(Boolean);
//       const query = unique.join(' ').trim();
//       console.log('🧩 [ShopPress] Final query:', query);

//       // 4) look memory (unchanged)
//       console.log('💾 [LookMemory] API_BASE_URL:', API_BASE_URL);
//       console.log('💾 [LookMemory] userId:', userId);
//       const payload = {
//         image_url: look.image_url,
//         ai_tags: unique,
//         query_used: query,
//       };

//       if (userId) {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify(payload),
//         });

//         const text = await res.text();
//         console.log(
//           '💾 [LookMemory] Status:',
//           res.status,
//           res.statusText,
//           text,
//         );
//         if (!res.ok)
//           throw new Error(`Look memory save failed (${res.status}): ${text}`);
//       } else {
//         console.warn('[LookMemory] No UUID found — skipping look memory save.');
//       }

//       // 5) success UX + open *your existing* shop modal which expects [query]
//       setSuccessState('shop');
//       setTimeout(() => setSuccessState(null), 1200);
//       setTimeout(async () => {
//         onClose();
//         await openShopModal?.([query]); // ← unchanged contract for your image-match flow
//         setShopLoading(false);
//       }, 500);
//     } catch (err) {
//       console.error('❌ [ShopPress] Error:', err);
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
//             style={[styles.closeIcon, {marginTop: 6}]}
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
//             style={[
//               styles.header,
//               {
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//                 paddingRight: 16,
//               },
//             ]}
//             blurType="dark"
//             blurAmount={20}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Text numberOfLines={1} style={globalStyles.sectionTitle}>
//               All Saved Looks
//             </Text>

//             <View style={{flexDirection: 'row'}}>
//               <TouchableOpacity
//                 onPress={() => setPersonalizedMode(false)}
//                 activeOpacity={0.8}
//                 style={{
//                   paddingVertical: 6,
//                   paddingHorizontal: 10,
//                   borderRadius: 14,
//                   backgroundColor: personalizedMode
//                     ? theme.colors.surface2
//                     : theme.colors.button1,
//                   borderWidth: StyleSheet.hairlineWidth,
//                   borderColor: theme.colors.muted,
//                 }}>
//                 <Text
//                   style={{
//                     color: personalizedMode ? theme.colors.foreground : 'white',
//                     fontSize: 12,
//                     fontWeight: '700',
//                   }}>
//                   Match Image
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 onPress={() => setPersonalizedMode(true)}
//                 activeOpacity={0.8}
//                 style={{
//                   paddingVertical: 6,
//                   paddingHorizontal: 10,
//                   borderRadius: 14,
//                   backgroundColor: personalizedMode
//                     ? theme.colors.button1
//                     : theme.colors.surface2,
//                   borderWidth: StyleSheet.hairlineWidth,
//                   borderColor: theme.colors.muted,
//                 }}>
//                 <Text
//                   style={{
//                     color: personalizedMode ? 'white' : theme.colors.foreground,
//                     fontSize: 12,
//                     fontWeight: '700',
//                   }}>
//                   Personalized
//                 </Text>
//               </TouchableOpacity>
//             </View>
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
//                     borderColor: theme.colors.surfaceBorder,
//                     borderWidth: tokens.borderWidth.md,
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

//                   {/* BUTTON CONTAINER */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       justifyContent: 'space-between',
//                       alignItems: 'center',
//                       paddingHorizontal: 8,
//                       marginLeft: -14,
//                       paddingVertical: 4,
//                     }}>
//                     {/* RECREATE VIBE BUTTON */}
//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         justifyContent: 'space-between',
//                         paddingHorizontal: 8,
//                         paddingVertical: 4,
//                       }}>
//                       <TouchableOpacity
//                         activeOpacity={0.8}
//                         onPress={() => {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           handleRecreatePress(look);
//                         }}
//                         disabled={loading}
//                         style={{
//                           backgroundColor: theme.colors.button1,
//                           borderRadius: tokens.borderRadius.md,
//                           paddingVertical: 6,
//                           paddingHorizontal: 10,
//                           opacity: loading ? 0.5 : 1,
//                           borderWidth: tokens.borderWidth.hairline,
//                           borderColor: theme.colors.muted,
//                           marginRight: 8, // ✅ manual spacing
//                         }}>
//                         <Text
//                           style={{
//                             color: 'white',
//                             fontWeight: '600',
//                             fontSize: 12,
//                           }}>
//                           {loading ? 'Recreate Vibe' : 'Recreate Vibe'}
//                         </Text>
//                       </TouchableOpacity>

//                       {/* SHOP VIBE BUTTON */}
//                       <TouchableOpacity
//                         activeOpacity={0.8}
//                         onPress={() => {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           handleShopPress(look);
//                         }}
//                         style={{
//                           backgroundColor: theme.colors.surface3,
//                           borderRadius: tokens.borderRadius.md,
//                           paddingVertical: 6,
//                           paddingHorizontal: 10,
//                           borderWidth: tokens.borderWidth.hairline,
//                           borderColor: theme.colors.muted,
//                         }}>
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             fontWeight: '600',
//                             fontSize: 12,
//                           }}>
//                           Shop Vibe
//                         </Text>
//                       </TouchableOpacity>
//                     </View>

//                     <TouchableOpacity
//                       activeOpacity={0.8}
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactMedium');
//                         openShopModal?.([look.query_used]);
//                       }}
//                       style={{
//                         backgroundColor: theme.colors.surface2,
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
//                         Re-shop This Vibe
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

//           {/* ✨ Unified Loading Overlay */}
//           {(loading || shopLoading) && (
//             <Animatable.View
//               animation="fadeIn"
//               duration={250}
//               style={{
//                 ...StyleSheet.absoluteFillObject,
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 zIndex: 999,
//               }}>
//               <Animatable.View
//                 animation="pulse"
//                 easing="ease-in-out"
//                 iterationCount="infinite"
//                 duration={1000}
//                 style={{
//                   width: 80,
//                   height: 80,
//                   borderRadius: 40,
//                   borderWidth: 3,
//                   borderColor: theme.colors.buttonText1,
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                 }}>
//                 <ActivityIndicator
//                   size="small"
//                   color={theme.colors.buttonText1}
//                 />
//               </Animatable.View>

//               <Text
//                 style={{
//                   color: theme.colors.buttonText1,
//                   fontWeight: '600',
//                   fontSize: 15,
//                   marginTop: 20,
//                 }}>
//                 {loading
//                   ? 'Recreating your vibe. Hang tight...'
//                   : 'Finding matching styles...'}
//               </Text>
//             </Animatable.View>
//           )}

//           {successState && (
//             <Animatable.View
//               animation="fadeIn"
//               duration={200}
//               style={{
//                 ...StyleSheet.absoluteFillObject,
//                 backgroundColor: 'rgba(0,0,0,0.6)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 zIndex: 1000,
//               }}>
//               <View
//                 style={{
//                   backgroundColor: 'rgba(255,255,255,0.1)',
//                   borderRadius: 80,
//                   width: 120,
//                   height: 120,
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                   borderWidth: 3,
//                   borderColor: theme.colors.buttonText1,
//                 }}>
//                 <MaterialIcons
//                   name="check"
//                   size={50}
//                   color={theme.colors.buttonText1}
//                 />
//               </View>
//               <Text
//                 style={{
//                   color: theme.colors.buttonText1,
//                   fontWeight: '700',
//                   fontSize: 15,
//                   marginTop: 18,
//                 }}>
//                 {successState === 'recreate'
//                   ? 'Vibe recreated!'
//                   : 'Styles found!'}
//               </Text>
//             </Animatable.View>
//           )}
//         </Animated.View>
//       </SafeAreaView>
//     </Modal>
//   );
// }

////////////////////

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
// import {useAnalyzeLook} from '../../hooks/useAnalyzeLook';
// import {useRecreateLook} from '../../hooks/useRecreateLook';
// import {useUUID} from '../../context/UUIDContext';
// import {API_BASE_URL} from '../../config/api';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// const {height} = Dimensions.get('window');

// export default function AllSavedLooksModal({
//   visible,
//   onClose,
//   savedLooks,
//   recreateLook,
//   openShopModal,
//   shopResults, // ✅ add this
//   openPersonalizedShopModal, // ← add this line
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
//   openPersonalizedShopModal?: (data: {
//     recreated_outfit?: any[];
//     purchases?: any[];
//     styleNote?: string;
//   }) => void;
// }) {
//   const uuidContext = useUUID();

//   const userId = uuidContext?.uuid || uuidContext; // ✅ works with both string or object
//   console.log('[UUIDContext] resolved userId →', userId);

//   const {analyzeLook} = useAnalyzeLook();
//   const translateY = useRef(new Animated.Value(0)).current;
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [loading, setLoading] = useState(false);
//   const [showShop, setShowShop] = useState(false);
//   // const [shopResults, setShopResults] = useState<any[]>([]);
//   const [shopLoading, setShopLoading] = useState(false);
//   const [successState, setSuccessState] = useState<'recreate' | 'shop' | null>(
//     null,
//   );

//   const [personalizedMode, setPersonalizedMode] = useState(false);
//   const {
//     recreateLook: runRecreate,
//     personalizedRecreate,
//     loading: recreateLoading,
//   } = useRecreateLook();

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
//       top: 100, // ⬅️ move it below the header (was 56)
//       height: 60, // ⬅️ slightly shorter
//       width: '100%',
//       zIndex: 2, // ⬅️ lower than header
//       backgroundColor: 'transparent',
//     },
//     header: {
//       marginTop: 42,
//       height: 50,
//       alignItems: 'center',
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       paddingHorizontal: 16,
//       borderBottomColor: 'rgba(255,255,255,0.08)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       backgroundColor: theme.colors.background,
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
//     try {
//       setLoading(true);

//       if (personalizedMode) {
//         console.log('💎 Personalized Recreate triggered →', look.image_url);

//         const data = await personalizedRecreate({
//           user_id: userId,
//           image_url: look.image_url,
//         });

//         console.log('💎 Personalized result:', data);

//         setSuccessState('recreate');
//         ReactNativeHapticFeedback.trigger('impactMedium');

//         if (openPersonalizedShopModal) {
//           // ✅ keep backend keys (snake_case)
//           openPersonalizedShopModal({
//             recreated_outfit: data?.recreated_outfit ?? [],
//             suggested_purchases: data?.suggested_purchases ?? [],
//             style_note: data?.style_note ?? '',
//           });
//         } else {
//           console.warn('⚠️ No personalized shop modal handler provided.');
//         }

//         onClose(); // ✅ Close SavedLooksModal
//         setTimeout(() => setSuccessState(null), 1200);
//         return;
//       }

//       // -------------------------------
//       // 🧥 Standard (Match Image) path
//       // -------------------------------
//       console.log('🧥 Standard Recreate triggered →', look.image_url);
//       ReactNativeHapticFeedback.trigger('impactMedium');

//       if (recreateLook) {
//         await recreateLook({
//           image_url: look.image_url,
//           tags: look.tags,
//         });
//         onClose();
//       } else {
//         console.warn('⚠️ No recreateLook handler provided.');
//       }

//       setSuccessState('recreate');
//       setTimeout(() => setSuccessState(null), 1200);
//     } catch (e) {
//       console.error('[AllSavedLooksModal] recreateLook failed:', e);
//     } finally {
//       console.log('✅ [handleRecreatePress] Loading cleared');
//       setLoading(false);
//     }
//   };

//   const handleShopPress = async (look: any) => {
//     if (!openShopModal && !openPersonalizedShopModal) return;

//     try {
//       setShopLoading(true);
//       console.log('🟢 [ShopPress] START — image:', look.image_url);

//       if (personalizedMode) {
//         console.log(
//           '🟡 [ShopPress] Personalized mode selected — ignored for Shop flow.',
//         );
//         // Continue straight to standard match-image path
//       }

//       // -------------------------------
//       // 🧩 MATCH IMAGE PATH (YOUR ORIGINAL)
//       // -------------------------------
//       // 1) analyze image → aiTags
//       const analysis = await analyzeLook(look.image_url);
//       const aiTags = analysis?.tags || [];
//       console.log('🧠 [ShopPress] AI tags:', aiTags);

//       // 2) merge metadata → words[]
//       const words: string[] = [];
//       if (look.gender || look.gender_presentation)
//         words.push((look.gender || look.gender_presentation).toLowerCase());
//       else words.push('men');

//       if (Array.isArray(aiTags))
//         words.push(...aiTags.map(t => t.toLowerCase()));
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

//       // 3) weighting
//       const weighted = words.flatMap(t => {
//         const x = t.toLowerCase();
//         if (/(flannel|denim|linen|corduroy)/.test(x)) return [x, x, x];
//         if (/(plaid|striped|solid|check)/.test(x)) return [x, x];
//         if (/(relaxed|tailored|oversized)/.test(x)) return [x, x];
//         if (/(autumn|winter|layered)/.test(x)) return [x, x];
//         return [x];
//       });

//       const unique = Array.from(new Set(weighted)).filter(Boolean);
//       const query = unique.join(' ').trim();
//       console.log('🧩 [ShopPress] Final query:', query);

//       // 4) look memory (unchanged)
//       console.log('💾 [LookMemory] API_BASE_URL:', API_BASE_URL);
//       console.log('💾 [LookMemory] userId:', userId);
//       const payload = {
//         image_url: look.image_url,
//         ai_tags: unique,
//         query_used: query,
//       };

//       if (userId) {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify(payload),
//         });

//         const text = await res.text();
//         console.log(
//           '💾 [LookMemory] Status:',
//           res.status,
//           res.statusText,
//           text,
//         );
//         if (!res.ok)
//           throw new Error(`Look memory save failed (${res.status}): ${text}`);
//       } else {
//         console.warn('[LookMemory] No UUID found — skipping look memory save.');
//       }

//       // 5) success UX + open *your existing* shop modal which expects [query]
//       setSuccessState('shop');
//       setTimeout(() => setSuccessState(null), 1200);
//       setTimeout(async () => {
//         onClose();
//         await openShopModal?.([query]); // ← unchanged contract for your image-match flow
//         setShopLoading(false);
//       }, 500);
//     } catch (err) {
//       console.error('❌ [ShopPress] Error:', err);
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
//             style={[styles.closeIcon, {marginTop: 6}]}
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
//             style={[
//               styles.header,
//               {
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//                 paddingRight: 16,
//               },
//             ]}
//             blurType="dark"
//             blurAmount={20}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Text numberOfLines={1} style={globalStyles.sectionTitle}>
//               All Saved Looks
//             </Text>

//             <View style={{flexDirection: 'row'}}>
//               <TouchableOpacity
//                 onPress={() => setPersonalizedMode(false)}
//                 activeOpacity={0.8}
//                 style={{
//                   paddingVertical: 6,
//                   paddingHorizontal: 10,
//                   borderRadius: 14,
//                   backgroundColor: personalizedMode
//                     ? theme.colors.surface2
//                     : theme.colors.button1,
//                   borderWidth: StyleSheet.hairlineWidth,
//                   borderColor: theme.colors.muted,
//                 }}>
//                 <Text
//                   style={{
//                     color: personalizedMode ? theme.colors.foreground : 'white',
//                     fontSize: 12,
//                     fontWeight: '700',
//                   }}>
//                   Match Image
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 onPress={() => setPersonalizedMode(true)}
//                 activeOpacity={0.8}
//                 style={{
//                   paddingVertical: 6,
//                   paddingHorizontal: 10,
//                   borderRadius: 14,
//                   backgroundColor: personalizedMode
//                     ? theme.colors.button1
//                     : theme.colors.surface2,
//                   borderWidth: StyleSheet.hairlineWidth,
//                   borderColor: theme.colors.muted,
//                 }}>
//                 <Text
//                   style={{
//                     color: personalizedMode ? 'white' : theme.colors.foreground,
//                     fontSize: 12,
//                     fontWeight: '700',
//                   }}>
//                   Personalized
//                 </Text>
//               </TouchableOpacity>
//             </View>
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
//                     borderColor: theme.colors.surfaceBorder,
//                     borderWidth: tokens.borderWidth.md,
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

//                   {/* BUTTON CONTAINER */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       justifyContent: 'space-between',
//                       alignItems: 'center',
//                       paddingHorizontal: 8,
//                       marginLeft: -14,
//                       paddingVertical: 4,
//                     }}>
//                     {/* RECREATE VIBE BUTTON */}
//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         justifyContent: 'space-between',
//                         paddingHorizontal: 8,
//                         paddingVertical: 4,
//                       }}>
//                       <TouchableOpacity
//                         activeOpacity={0.8}
//                         onPress={() => {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           handleRecreatePress(look);
//                         }}
//                         disabled={loading}
//                         style={{
//                           backgroundColor: theme.colors.button1,
//                           borderRadius: tokens.borderRadius.md,
//                           paddingVertical: 6,
//                           paddingHorizontal: 10,
//                           opacity: loading ? 0.5 : 1,
//                           borderWidth: tokens.borderWidth.hairline,
//                           borderColor: theme.colors.muted,
//                           marginRight: 8, // ✅ manual spacing
//                         }}>
//                         <Text
//                           style={{
//                             color: 'white',
//                             fontWeight: '600',
//                             fontSize: 12,
//                           }}>
//                           {loading ? 'Recreate Vibe' : 'Recreate Vibe'}
//                         </Text>
//                       </TouchableOpacity>

//                       {/* SHOP VIBE BUTTON */}
//                       <TouchableOpacity
//                         activeOpacity={0.8}
//                         onPress={() => {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           handleShopPress(look);
//                         }}
//                         style={{
//                           backgroundColor: theme.colors.surface3,
//                           borderRadius: tokens.borderRadius.md,
//                           paddingVertical: 6,
//                           paddingHorizontal: 10,
//                           borderWidth: tokens.borderWidth.hairline,
//                           borderColor: theme.colors.muted,
//                         }}>
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             fontWeight: '600',
//                             fontSize: 12,
//                           }}>
//                           Shop Vibe
//                         </Text>
//                       </TouchableOpacity>
//                     </View>

//                     <TouchableOpacity
//                       activeOpacity={0.8}
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactMedium');
//                         openShopModal?.([look.query_used]);
//                       }}
//                       style={{
//                         backgroundColor: theme.colors.surface2,
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
//                         Re-shop This Vibe
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

//           {/* ✨ Unified Loading Overlay */}
//           {(loading || shopLoading) && (
//             <Animatable.View
//               animation="fadeIn"
//               duration={250}
//               style={{
//                 ...StyleSheet.absoluteFillObject,
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 zIndex: 999,
//               }}>
//               <Animatable.View
//                 animation="pulse"
//                 easing="ease-in-out"
//                 iterationCount="infinite"
//                 duration={1000}
//                 style={{
//                   width: 80,
//                   height: 80,
//                   borderRadius: 40,
//                   borderWidth: 3,
//                   borderColor: theme.colors.buttonText1,
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                 }}>
//                 <ActivityIndicator
//                   size="small"
//                   color={theme.colors.buttonText1}
//                 />
//               </Animatable.View>

//               <Text
//                 style={{
//                   color: theme.colors.buttonText1,
//                   fontWeight: '600',
//                   fontSize: 15,
//                   marginTop: 20,
//                 }}>
//                 {loading
//                   ? 'Recreating your vibe. Hang tight...'
//                   : 'Finding matching styles...'}
//               </Text>
//             </Animatable.View>
//           )}

//           {successState && (
//             <Animatable.View
//               animation="fadeIn"
//               duration={200}
//               style={{
//                 ...StyleSheet.absoluteFillObject,
//                 backgroundColor: 'rgba(0,0,0,0.6)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 zIndex: 1000,
//               }}>
//               <View
//                 style={{
//                   backgroundColor: 'rgba(255,255,255,0.1)',
//                   borderRadius: 80,
//                   width: 120,
//                   height: 120,
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                   borderWidth: 3,
//                   borderColor: theme.colors.buttonText1,
//                 }}>
//                 <MaterialIcons
//                   name="check"
//                   size={50}
//                   color={theme.colors.buttonText1}
//                 />
//               </View>
//               <Text
//                 style={{
//                   color: theme.colors.buttonText1,
//                   fontWeight: '700',
//                   fontSize: 15,
//                   marginTop: 18,
//                 }}>
//                 {successState === 'recreate'
//                   ? 'Vibe recreated!'
//                   : 'Styles found!'}
//               </Text>
//             </Animatable.View>
//           )}
//         </Animated.View>
//       </SafeAreaView>
//     </Modal>
//   );
// }
