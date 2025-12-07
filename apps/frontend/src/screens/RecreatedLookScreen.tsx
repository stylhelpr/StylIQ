/* eslint-disable react-native/no-inline-styles */
import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {WebView} from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {tokens} from '../styles/tokens/tokens';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {useSimilarLooks} from '../hooks/useSimilarLooks';
import FrostedCard from '../components/FrostedCard/FrostedCard';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {fontScale, moderateScale} from '../utils/scale';

const {width} = Dimensions.get('window');
const CARD_WIDTH = width / 2 - tokens.spacing.md * 1.5;

type WardrobeItem = {
  id: string;
  name: string;
  image?: string;
  brand?: string;
  price?: string;
  source?: string;
  shopUrl?: string;
};

type Props = {
  route: {
    params: {
      data: {
        owned?: WardrobeItem[];
        recommendations?: WardrobeItem[];
        outfit?: WardrobeItem[];
      };
    };
  };
  navigation: any;
};

export default function RecreatedLookScreen({route, navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {outfit = [], recommendations = []} = route.params?.data || {};
  const owned = outfit.length ? outfit : route.params?.data?.owned || [];
  const {fetchSimilar, data, loading} = useSimilarLooks();

  const [shopUrl, setShopUrl] = useState<string | null>(null);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  const closeAllModals = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setShowSimilarModal(false);
    setShopUrl(null);
  };

  const handleBack = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    ReactNativeHapticFeedback.trigger('impactLight');

    // Animate modal down before closing
    Animated.timing(translateY, {
      toValue: 1000,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      navigation.goBack();
    });
  };

  const openShopModal = (url?: string) => {
    if (!url) return;
    ReactNativeHapticFeedback.trigger('impactLight');
    setShowSimilarModal(false);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setShopUrl(url), 250);
  };

  const closeShopModal = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setShopUrl(null);
  };

  const renderCard = (
    item: WardrobeItem,
    idx: number,
    isRecommended = false,
  ) => (
    <Animatable.View
      key={`${item.id}-${idx}`}
      animation="fadeInUp"
      delay={idx * 70}
      duration={400}
      style={{
        // width: '49.0%',
        // marginBottom: tokens.spacing.xsm,
        width: '49.5%',
        marginBottom: tokens.spacing.nano,
        backgroundColor: theme.colors.surface,
        // borderWidth: tokens.borderWidth.md,
        // borderColor: theme.colors.surfaceBorder,
        // borderRadius: tokens.borderRadius.lg,
        overflow: 'hidden',
      }}>
      {/* 🖼️ Product Image */}
      <View
        style={{
          width: '100%',
          aspectRatio: 3 / 4,
          backgroundColor: theme.colors.surface,
          overflow: 'hidden',
        }}>
        <Image
          source={{
            uri:
              item.image ||
              'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
          }}
          resizeMode="cover"
        />

        {/* 🔵 Similar Looks button overlay */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            closeAllModals();
            // ReactNativeHapticFeedback.trigger('impactLight');
            fetchSimilar(item.image);
            setShowSimilarModal(true);
          }}
          style={{
            position: 'absolute',
            bottom: 10,
            alignSelf: 'center',
            backgroundColor: 'rgba(255,255,255,0.75)',
            // borderRadius: tokens.borderRadius.lg,
            borderRadius: tokens.borderRadius.sm,
            borderWidth: tokens.borderWidth.hairline,
            borderColor: 'black',
            paddingVertical: 8,
            paddingHorizontal: 14,
          }}>
          <Text
            style={{
              color: 'black',
              fontWeight: '700',
              fontSize: 13,
              letterSpacing: 0.2,
            }}>
            Similar Items
          </Text>
        </TouchableOpacity>
      </View>

      {/* 🧾 Card Body */}
      <View
        style={{
          paddingHorizontal: tokens.spacing.xsm,
          paddingVertical: tokens.spacing.xxs,
        }}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.foreground,
            fontWeight: '400',
            fontSize: 13,
          }}>
          {item.name}
        </Text>

        {item.brand && (
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.foreground,
              opacity: 0.7,
              fontSize: 11,
              marginTop: 6,
            }}>
            {item.brand}
          </Text>
        )}

        {item.price && (
          <Text
            style={{
              color: theme.colors.foreground,
              fontWeight: '700',
              fontSize: 13,
              marginTop: 6,
            }}>
            {item.price}
          </Text>
        )}

        {/* {item.source && (
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.foreground,
              opacity: 0.6,
              fontSize: 11,
              marginTop: 2,
            }}>
            Source: {item.source}
          </Text>
        )} */}

        {/* 🛍️ Shop CTA */}
        {isRecommended && (
          <TouchableOpacity
            onPress={() => openShopModal(item.shopUrl)}
            activeOpacity={0.85}
            style={{
              marginTop: 10,
              backgroundColor: theme.colors.surface2,
              borderRadius: tokens.borderRadius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 6,
              borderWidth: tokens.borderWidth.hairline,
              borderColor: theme.colors.surfaceBorder,
            }}>
            <Text
              style={{
                color: theme.colors.foreground,
                fontWeight: '600',
                fontSize: 13,
              }}>
              {item.shopUrl ? 'Shop Similar →' : 'View Details'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animatable.View>
  );

  // 🧊 Entire screen wrapped in modal like ShopModal
  return (
    <Modal visible animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: tokens.spacing.sm,
        }}>
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 700,
            height: '90%',
            transform: [{translateY}],
          }}>
          <Animatable.View
            animation="fadeInUp"
            duration={300}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: theme.colors.background,
              borderRadius: tokens.borderRadius['2xl'],
              overflow: 'hidden',
              // paddingTop: insets.top + 20,
              paddingHorizontal: moderateScale(tokens.spacing.md1),
            }}>
          {/* ❌ Close */}
          <TouchableOpacity
            onPress={handleBack}
            style={{
              position: 'absolute',
              top: 10,
              right: 20,
              zIndex: 10,
              backgroundColor: theme.colors.foreground,
              borderRadius: 24,
              padding: 6,
            }}>
            <MaterialIcons
              name="close"
              size={22}
              color={theme.colors.background}
            />
          </TouchableOpacity>

          {/* Main Scroll */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              globalStyles.centeredSection,
              {paddingTop: 20, paddingBottom: 100},
            ]}>
            <Text
              style={[
                globalStyles.sectionTitle,
                {marginBottom: 8, textAlign: 'left'},
              ]}>
              Recreated Look
            </Text>

            {/* 👕 Owned */}
            {owned.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}>
                {owned.map((item, idx) => renderCard(item, idx))}
              </View>
            )}

            {/* 🛍️ Recommended */}
            {recommendations.length > 0 && (
              <>
                <Text
                  style={[
                    globalStyles.sectionTitle,
                    {fontSize: 20, marginTop: 30, marginBottom: 10},
                  ]}>
                  🛍️ Recommended to Add
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                  }}>
                  {recommendations.map((item, idx) =>
                    renderCard(item, idx, true),
                  )}
                </View>
              </>
            )}

            {/* 🪞 Empty */}
            {owned.length === 0 && recommendations.length === 0 && (
              <View style={{alignItems: 'center', marginTop: 50}}>
                <Text
                  style={{
                    color: theme.colors.foreground,
                    opacity: 0.7,
                    fontSize: 16,
                  }}>
                  No outfit data found. Try recreating another look.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* 🌐 SHOP MODAL */}
          <Modal
            visible={!!shopUrl}
            animationType="fade"
            transparent
            onRequestClose={closeShopModal}>
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.6)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: tokens.spacing.sm,
              }}>
              <Animatable.View
                animation="fadeInUp"
                duration={250}
                style={{
                  width: '100%',
                  maxWidth: 700,
                  height: '90%',
                  borderRadius: tokens.borderRadius['2xl'],
                  overflow: 'hidden',
                  backgroundColor: theme.colors.surface,
                }}>
                {/* Close */}
                <TouchableOpacity
                  onPress={closeShopModal}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 20,
                    zIndex: 999,
                    backgroundColor: theme.colors.foreground,
                    borderRadius: 24,
                    padding: 6,
                  }}>
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={theme.colors.background}
                  />
                </TouchableOpacity>

                {shopUrl ? (
                  <WebView
                    source={{uri: shopUrl}}
                    startInLoadingState
                    style={{flex: 1, backgroundColor: theme.colors.surface}}
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <ActivityIndicator
                      size="large"
                      color={theme.colors.primary}
                    />
                  </View>
                )}
              </Animatable.View>
            </View>
          </Modal>

          {/* 🔍 SIMILAR LOOKS MODAL */}
          <Modal visible={showSimilarModal} animationType="fade" transparent>
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: tokens.spacing.sm,
              }}>
              <Animatable.View
                animation="fadeInUp"
                duration={250}
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  height: '90%',
                  borderRadius: tokens.borderRadius['2xl'],
                  overflow: 'hidden',
                  backgroundColor: theme.colors.background,
                  paddingVertical: tokens.spacing.md,
                  paddingHorizontal: moderateScale(tokens.spacing.md1),
                }}>
                {/* Close */}
                <TouchableOpacity
                  onPress={closeAllModals}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 20,
                    zIndex: 999,
                    backgroundColor: theme.colors.foreground,
                    borderRadius: 24,
                    padding: 6,
                  }}>
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={theme.colors.background}
                  />
                </TouchableOpacity>

                {loading ? (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <ActivityIndicator
                      size="large"
                      color={theme.colors.primary}
                    />
                    <Text
                      style={{
                        color: theme.colors.foreground,
                        marginTop: 12,
                        opacity: 0.7,
                      }}>
                      Finding similar looks...
                    </Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text
                      style={[
                        globalStyles.sectionTitle,
                        {fontSize: 20, marginBottom: 10},
                      ]}>
                      Similar Items
                    </Text>

                    {data.length === 0 ? (
                      <View style={{alignItems: 'center', marginTop: 40}}>
                        <Text
                          style={{
                            color: theme.colors.foreground,
                            opacity: 0.7,
                          }}>
                          No similar items found.
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          backgroundColor: theme.colors.background,
                        }}>
                        {data.map((look, idx) => (
                          <TouchableOpacity
                            key={idx}
                            activeOpacity={0.85}
                            onPress={() => {
                              // ReactNativeHapticFeedback.trigger('impactLight');
                              setShowSimilarModal(false);
                              setTimeout(() => openShopModal(look.link), 300);
                            }}
                            style={{
                              // width: '49.0%',
                              // marginBottom: tokens.spacing.xsm,
                              width: '49.5%',
                              marginBottom: tokens.spacing.nano,
                              backgroundColor: theme.colors.surface,
                              // borderWidth: tokens.borderWidth.md,
                              // borderColor: theme.colors.surfaceBorder,
                              // borderRadius: tokens.borderRadius.lg,
                              overflow: 'hidden',
                            }}>
                            {/* 🖼️ Product Image (fills entire card) */}
                            <View
                              style={{
                                width: '100%',
                                aspectRatio: 3 / 4,
                                backgroundColor: theme.colors.surface,
                                overflow: 'hidden',
                              }}>
                              <Image
                                source={{
                                  uri:
                                    look.image ||
                                    'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
                                }}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  position: 'absolute',
                                }}
                                resizeMode="cover" // ✅ fills the container, cropping edges if needed
                              />

                              {/* 🛒 Click to Buy Button Overlay */}
                              <View
                                style={{
                                  position: 'absolute',
                                  bottom: 10,
                                  alignSelf: 'center',
                                  backgroundColor: 'rgba(255,255,255,0.75)',
                                  // borderRadius: tokens.borderRadius.lg,
                                  borderRadius: tokens.borderRadius.sm,
                                  borderWidth: tokens.borderWidth.md,
                                  borderColor: 'black',
                                  paddingVertical: 8,
                                  paddingHorizontal: 14,
                                }}>
                                <Text
                                  style={{
                                    color: 'black',
                                    fontWeight: '700',
                                    fontSize: 13,
                                    letterSpacing: 0.2,
                                  }}>
                                  Click to Buy
                                </Text>
                              </View>
                            </View>

                            {/* 🧾 Product Info Section */}
                            <View style={{padding: 8}}>
                              {/* Title */}
                              <Text
                                numberOfLines={1}
                                style={{
                                  color: theme.colors.foreground,
                                  fontWeight: '400',
                                  fontSize: 13,
                                  textTransform: 'uppercase',
                                }}>
                                {look.title || 'Similar look'}
                              </Text>

                              {/* Brand */}
                              {look.brand ? (
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    color: theme.colors.foreground,
                                    opacity: 0.7,
                                    marginTop: 6,
                                    fontSize: 11,
                                    fontWeight: '500',
                                  }}>
                                  {look.brand}
                                </Text>
                              ) : null}

                              {/* Price — reserve height even if missing */}

                              {look.price ? (
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    fontWeight: '500',
                                    fontSize: 12,
                                    marginTop: 6,
                                    color: theme.colors.foreground,
                                  }}>
                                  {look.price}
                                </Text>
                              ) : (
                                <Text
                                  style={{
                                    opacity: 0,
                                    fontSize: 13,
                                    fontWeight: '700',
                                  }}>
                                  placeholder
                                </Text>
                              )}

                              {/* Source */}
                              {/* {look.source ? (
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    color: theme.colors.foreground,
                                    opacity: 0.6,
                                    fontSize: 10,
                                    marginTop: 2,
                                  }}>
                                  Source: {look.source}
                                </Text>
                              ) : null} */}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                )}
              </Animatable.View>
            </View>
          </Modal>
          </Animatable.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
//   ActivityIndicator,
//   Dimensions,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {WebView} from 'react-native-webview';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../styles/tokens/tokens';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useSimilarLooks} from '../hooks/useSimilarLooks';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {fontScale, moderateScale} from '../utils/scale';

// const {width} = Dimensions.get('window');
// const CARD_WIDTH = width / 2 - tokens.spacing.md * 1.5;

// type WardrobeItem = {
//   id: string;
//   name: string;
//   image?: string;
//   brand?: string;
//   price?: string;
//   source?: string;
//   shopUrl?: string;
// };

// type Props = {
//   route: {
//     params: {
//       data: {
//         owned?: WardrobeItem[];
//         recommendations?: WardrobeItem[];
//         outfit?: WardrobeItem[];
//       };
//     };
//   };
//   navigation: any;
// };

// export default function RecreatedLookScreen({route, navigation}: Props) {
//   const insets = useSafeAreaInsets();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {outfit = [], recommendations = []} = route.params?.data || {};
//   const owned = outfit.length ? outfit : route.params?.data?.owned || [];
//   const {fetchSimilar, data, loading} = useSimilarLooks();

//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const [showSimilarModal, setShowSimilarModal] = useState(false);
//   const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   const closeAllModals = () => {
//     if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
//     setShowSimilarModal(false);
//     setShopUrl(null);
//   };

//   const handleBack = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     navigation.goBack();
//   };

//   const openShopModal = (url?: string) => {
//     if (!url) return;
//     ReactNativeHapticFeedback.trigger('impactLight');
//     setShowSimilarModal(false);
//     if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
//     closeTimeoutRef.current = setTimeout(() => setShopUrl(url), 250);
//   };

//   const closeShopModal = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     setShopUrl(null);
//   };

//   const renderCard = (
//     item: WardrobeItem,
//     idx: number,
//     isRecommended = false,
//   ) => (
//     <Animatable.View
//       key={`${item.id}-${idx}`}
//       animation="fadeInUp"
//       delay={idx * 70}
//       duration={400}
//       style={{
//         width: '49.0%',
//         marginBottom: tokens.spacing.xsm,
//         backgroundColor: theme.colors.surface,
//         borderWidth: tokens.borderWidth.md,
//         borderColor: theme.colors.surfaceBorder,
//         borderRadius: tokens.borderRadius.lg,
//         overflow: 'hidden',
//       }}>
//       {/* 🖼️ Product Image */}
//       <View
//         style={{
//           width: '100%',
//           aspectRatio: 3 / 4,
//           backgroundColor: theme.colors.surface,
//           overflow: 'hidden',
//         }}>
//         <Image
//           source={{
//             uri:
//               item.image ||
//               'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//           }}
//           style={{
//             width: '100%',
//             height: '100%',
//             position: 'absolute',
//           }}
//           resizeMode="cover"
//         />

//         {/* 🔵 Similar Looks button overlay */}
//         <TouchableOpacity
//           activeOpacity={0.85}
//           onPress={() => {
//             closeAllModals();
//             // ReactNativeHapticFeedback.trigger('impactLight');
//             fetchSimilar(item.image);
//             setShowSimilarModal(true);
//           }}
//           style={{
//             position: 'absolute',
//             bottom: 10,
//             alignSelf: 'center',
//             backgroundColor: 'rgba(255,255,255,0.75)',
//             borderRadius: tokens.borderRadius.lg,
//             borderWidth: tokens.borderWidth.hairline,
//             borderColor: 'black',
//             paddingVertical: 8,
//             paddingHorizontal: 14,
//           }}>
//           <Text
//             style={{
//               color: 'black',
//               fontWeight: '700',
//               fontSize: 13,
//               letterSpacing: 0.2,
//             }}>
//             Similar Items →
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* 🧾 Card Body */}
//       <View
//         style={{
//           paddingHorizontal: tokens.spacing.xsm,
//           paddingVertical: tokens.spacing.xxs,
//         }}>
//         <Text
//           numberOfLines={1}
//           style={{
//             color: theme.colors.foreground,
//             fontWeight: '400',
//             fontSize: 13,
//           }}>
//           {item.name}
//         </Text>

//         {item.brand && (
//           <Text
//             numberOfLines={1}
//             style={{
//               color: theme.colors.foreground,
//               opacity: 0.7,
//               fontSize: 11,
//               marginTop: 6,
//             }}>
//             {item.brand}
//           </Text>
//         )}

//         {item.price && (
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               fontWeight: '700',
//               fontSize: 13,
//               marginTop: 6,
//             }}>
//             {item.price}
//           </Text>
//         )}

//         {/* {item.source && (
//           <Text
//             numberOfLines={1}
//             style={{
//               color: theme.colors.foreground,
//               opacity: 0.6,
//               fontSize: 11,
//               marginTop: 2,
//             }}>
//             Source: {item.source}
//           </Text>
//         )} */}

//         {/* 🛍️ Shop CTA */}
//         {isRecommended && (
//           <TouchableOpacity
//             onPress={() => openShopModal(item.shopUrl)}
//             activeOpacity={0.85}
//             style={{
//               marginTop: 10,
//               backgroundColor: theme.colors.surface2,
//               borderRadius: tokens.borderRadius.lg,
//               alignItems: 'center',
//               justifyContent: 'center',
//               paddingVertical: 6,
//               borderWidth: tokens.borderWidth.hairline,
//               borderColor: theme.colors.surfaceBorder,
//             }}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '600',
//                 fontSize: 13,
//               }}>
//               {item.shopUrl ? 'Shop Similar →' : 'View Details'}
//             </Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </Animatable.View>
//   );

//   // 🧊 Entire screen wrapped in modal like ShopModal
//   return (
//     <Modal visible animationType="fade" transparent>
//       <View
//         style={{
//           flex: 1,
//           backgroundColor: 'rgba(0,0,0,0.5)',
//           justifyContent: 'center',
//           alignItems: 'center',
//           paddingVertical: tokens.spacing.sm,
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           duration={300}
//           style={{
//             width: '100%',
//             maxWidth: 700,
//             height: '90%',
//             backgroundColor: theme.colors.background,
//             borderRadius: tokens.borderRadius['2xl'],
//             overflow: 'hidden',
//             // paddingTop: insets.top + 20,
//             paddingHorizontal: moderateScale(tokens.spacing.md1),
//           }}>
//           {/* ❌ Close */}
//           <TouchableOpacity
//             onPress={handleBack}
//             style={{
//               position: 'absolute',
//               top: 10,
//               right: 20,
//               zIndex: 10,
//               backgroundColor: theme.colors.foreground,
//               borderRadius: 24,
//               padding: 6,
//             }}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.background}
//             />
//           </TouchableOpacity>

//           {/* Main Scroll */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={[
//               globalStyles.centeredSection,
//               {paddingTop: 20, paddingBottom: 100},
//             ]}>
//             <Text
//               style={[
//                 globalStyles.sectionTitle,
//                 {marginBottom: 8, textAlign: 'left'},
//               ]}>
//               Recreated Look
//             </Text>

//             {/* 👕 Owned */}
//             {owned.length > 0 && (
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'space-between',
//                 }}>
//                 {owned.map((item, idx) => renderCard(item, idx))}
//               </View>
//             )}

//             {/* 🛍️ Recommended */}
//             {recommendations.length > 0 && (
//               <>
//                 <Text
//                   style={[
//                     globalStyles.sectionTitle,
//                     {fontSize: 20, marginTop: 30, marginBottom: 10},
//                   ]}>
//                   🛍️ Recommended to Add
//                 </Text>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                   }}>
//                   {recommendations.map((item, idx) =>
//                     renderCard(item, idx, true),
//                   )}
//                 </View>
//               </>
//             )}

//             {/* 🪞 Empty */}
//             {owned.length === 0 && recommendations.length === 0 && (
//               <View style={{alignItems: 'center', marginTop: 50}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     opacity: 0.7,
//                     fontSize: 16,
//                   }}>
//                   No outfit data found. Try recreating another look.
//                 </Text>
//               </View>
//             )}
//           </ScrollView>

//           {/* 🌐 SHOP MODAL */}
//           <Modal
//             visible={!!shopUrl}
//             animationType="fade"
//             transparent
//             onRequestClose={closeShopModal}>
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: 'rgba(0,0,0,0.6)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 padding: tokens.spacing.sm,
//               }}>
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={250}
//                 style={{
//                   width: '100%',
//                   maxWidth: 700,
//                   height: '90%',
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 {/* Close */}
//                 <TouchableOpacity
//                   onPress={closeShopModal}
//                   style={{
//                     position: 'absolute',
//                     top: 10,
//                     right: 20,
//                     zIndex: 999,
//                     backgroundColor: theme.colors.foreground,
//                     borderRadius: 24,
//                     padding: 6,
//                   }}>
//                   <MaterialIcons
//                     name="close"
//                     size={22}
//                     color={theme.colors.background}
//                   />
//                 </TouchableOpacity>

//                 {shopUrl ? (
//                   <WebView
//                     source={{uri: shopUrl}}
//                     startInLoadingState
//                     style={{flex: 1, backgroundColor: theme.colors.surface}}
//                   />
//                 ) : (
//                   <View
//                     style={{
//                       flex: 1,
//                       justifyContent: 'center',
//                       alignItems: 'center',
//                     }}>
//                     <ActivityIndicator
//                       size="large"
//                       color={theme.colors.primary}
//                     />
//                   </View>
//                 )}
//               </Animatable.View>
//             </View>
//           </Modal>

//           {/* 🔍 SIMILAR LOOKS MODAL */}
//           <Modal visible={showSimilarModal} animationType="fade" transparent>
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: 'rgba(0,0,0,0.1)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 paddingVertical: tokens.spacing.sm,
//               }}>
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={250}
//                 style={{
//                   width: '100%',
//                   maxWidth: '100%',
//                   height: '90%',
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.background,
//                   paddingVertical: tokens.spacing.md,
//                   paddingHorizontal: moderateScale(tokens.spacing.md1),
//                 }}>
//                 {/* Close */}
//                 <TouchableOpacity
//                   onPress={closeAllModals}
//                   style={{
//                     position: 'absolute',
//                     top: 10,
//                     right: 20,
//                     zIndex: 999,
//                     backgroundColor: theme.colors.foreground,
//                     borderRadius: 24,
//                     padding: 6,
//                   }}>
//                   <MaterialIcons
//                     name="close"
//                     size={22}
//                     color={theme.colors.background}
//                   />
//                 </TouchableOpacity>

//                 {loading ? (
//                   <View
//                     style={{
//                       flex: 1,
//                       justifyContent: 'center',
//                       alignItems: 'center',
//                     }}>
//                     <ActivityIndicator
//                       size="large"
//                       color={theme.colors.primary}
//                     />
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         marginTop: 12,
//                         opacity: 0.7,
//                       }}>
//                       Finding similar looks...
//                     </Text>
//                   </View>
//                 ) : (
//                   <ScrollView showsVerticalScrollIndicator={false}>
//                     <Text
//                       style={[
//                         globalStyles.sectionTitle,
//                         {fontSize: 20, marginBottom: 10},
//                       ]}>
//                       Similar Items
//                     </Text>

//                     {data.length === 0 ? (
//                       <View style={{alignItems: 'center', marginTop: 40}}>
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.7,
//                           }}>
//                           No similar items found.
//                         </Text>
//                       </View>
//                     ) : (
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           flexWrap: 'wrap',
//                           justifyContent: 'space-between',
//                           backgroundColor: theme.colors.background,
//                         }}>
//                         {data.map((look, idx) => (
//                           <TouchableOpacity
//                             key={idx}
//                             activeOpacity={0.85}
//                             onPress={() => {
//                               // ReactNativeHapticFeedback.trigger('impactLight');
//                               setShowSimilarModal(false);
//                               setTimeout(() => openShopModal(look.link), 300);
//                             }}
//                             style={{
//                               width: '49.0%',
//                               marginBottom: tokens.spacing.xsm,
//                               backgroundColor: theme.colors.surface,
//                               borderWidth: tokens.borderWidth.md,
//                               borderColor: theme.colors.surfaceBorder,
//                               borderRadius: tokens.borderRadius.lg,
//                               overflow: 'hidden',
//                             }}>
//                             {/* 🖼️ Product Image (fills entire card) */}
//                             <View
//                               style={{
//                                 width: '100%',
//                                 aspectRatio: 3 / 4,
//                                 backgroundColor: theme.colors.surface,
//                                 overflow: 'hidden',
//                               }}>
//                               <Image
//                                 source={{
//                                   uri:
//                                     look.image ||
//                                     'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//                                 }}
//                                 style={{
//                                   width: '100%',
//                                   height: '100%',
//                                   position: 'absolute',
//                                 }}
//                                 resizeMode="cover" // ✅ fills the container, cropping edges if needed
//                               />

//                               {/* 🛒 Click to Buy Button Overlay */}
//                               <View
//                                 style={{
//                                   position: 'absolute',
//                                   bottom: 10,
//                                   alignSelf: 'center',
//                                   backgroundColor: 'rgba(255,255,255,0.75)',
//                                   borderRadius: tokens.borderRadius.lg,
//                                   borderWidth: tokens.borderWidth.hairline,
//                                   borderColor: 'black',
//                                   paddingVertical: 8,
//                                   paddingHorizontal: 14,
//                                 }}>
//                                 <Text
//                                   style={{
//                                     color: 'black',
//                                     fontWeight: '700',
//                                     fontSize: 13,
//                                     letterSpacing: 0.2,
//                                   }}>
//                                   Click to Buy →
//                                 </Text>
//                               </View>
//                             </View>

//                             {/* 🧾 Product Info Section */}
//                             <View style={{padding: 8}}>
//                               {/* Title */}
//                               <Text
//                                 numberOfLines={1}
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '400',
//                                   fontSize: 13,
//                                 }}>
//                                 {look.title || 'Similar look'}
//                               </Text>

//                               {/* Brand */}
//                               {look.brand ? (
//                                 <Text
//                                   numberOfLines={1}
//                                   style={{
//                                     color: theme.colors.foreground,
//                                     opacity: 0.7,
//                                     fontSize: 11,
//                                     marginTop: 6,
//                                   }}>
//                                   {look.brand}
//                                 </Text>
//                               ) : null}

//                               {/* Price — reserve height even if missing */}

//                               {look.price ? (
//                                 <Text
//                                   numberOfLines={1}
//                                   style={{
//                                     fontWeight: '700',
//                                     fontSize: 13,
//                                     marginTop: 6,
//                                     color: theme.colors.foreground,
//                                   }}>
//                                   {look.price}
//                                 </Text>
//                               ) : (
//                                 <Text
//                                   style={{
//                                     opacity: 0,
//                                     fontSize: 13,
//                                     fontWeight: '700',
//                                   }}>
//                                   placeholder
//                                 </Text>
//                               )}

//                               {/* Source */}
//                               {/* {look.source ? (
//                                 <Text
//                                   numberOfLines={1}
//                                   style={{
//                                     color: theme.colors.foreground,
//                                     opacity: 0.6,
//                                     fontSize: 10,
//                                     marginTop: 2,
//                                   }}>
//                                   Source: {look.source}
//                                 </Text>
//                               ) : null} */}
//                             </View>
//                           </TouchableOpacity>
//                         ))}
//                       </View>
//                     )}
//                   </ScrollView>
//                 )}
//               </Animatable.View>
//             </View>
//           </Modal>
//         </Animatable.View>
//       </View>
//     </Modal>
//   );
// }

/////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
//   ActivityIndicator,
//   Dimensions,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {WebView} from 'react-native-webview';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../styles/tokens/tokens';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useSimilarLooks} from '../hooks/useSimilarLooks';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';

// const {width} = Dimensions.get('window');
// const CARD_WIDTH = width / 2 - tokens.spacing.md * 1.5;

// type WardrobeItem = {
//   id: string;
//   name: string;
//   image?: string;
//   brand?: string;
//   price?: string;
//   source?: string;
//   shopUrl?: string;
// };

// type Props = {
//   route: {
//     params: {
//       data: {
//         owned?: WardrobeItem[];
//         recommendations?: WardrobeItem[];
//         outfit?: WardrobeItem[];
//       };
//     };
//   };
//   navigation: any;
// };

// export default function RecreatedLookScreen({route, navigation}: Props) {
//   const insets = useSafeAreaInsets();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {outfit = [], recommendations = []} = route.params?.data || {};
//   const owned = outfit.length ? outfit : route.params?.data?.owned || [];
//   const {fetchSimilar, data, loading} = useSimilarLooks();

//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const [showSimilarModal, setShowSimilarModal] = useState(false);
//   const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   const closeAllModals = () => {
//     if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
//     setShowSimilarModal(false);
//     setShopUrl(null);
//   };

//   const handleBack = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     navigation.goBack();
//   };

//   const openShopModal = (url?: string) => {
//     if (!url) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     setShowSimilarModal(false);
//     if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
//     closeTimeoutRef.current = setTimeout(() => setShopUrl(url), 250);
//   };

//   const closeShopModal = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     setShopUrl(null);
//   };

//   const renderCard = (
//     item: WardrobeItem,
//     idx: number,
//     isRecommended = false,
//   ) => (
//     <Animatable.View
//       key={`${item.id}-${idx}`}
//       animation="fadeInUp"
//       delay={idx * 70}
//       duration={400}
//       style={{
//         width: '49.0%',
//         marginBottom: tokens.spacing.xsm,
//         backgroundColor: theme.colors.surface,
//         borderWidth: tokens.borderWidth.md,
//         borderColor: theme.colors.surfaceBorder,
//         borderRadius: tokens.borderRadius.lg,
//         overflow: 'hidden',
//       }}>
//       {/* 🖼️ Product Image */}
//       <View
//         style={{
//           width: '100%',
//           aspectRatio: 3 / 4,
//           backgroundColor: theme.colors.surface,
//           overflow: 'hidden',
//         }}>
//         <Image
//           source={{
//             uri:
//               item.image ||
//               'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//           }}
//           style={{
//             width: '100%',
//             height: '100%',
//             position: 'absolute',
//           }}
//           resizeMode="cover"
//         />

//         {/* 🔵 Similar Looks button overlay */}
//         <TouchableOpacity
//           activeOpacity={0.85}
//           onPress={() => {
//             closeAllModals();
//             ReactNativeHapticFeedback.trigger('impactMedium');
//             fetchSimilar(item.image);
//             setShowSimilarModal(true);
//           }}
//           style={{
//             position: 'absolute',
//             bottom: 10,
//             alignSelf: 'center',
//             backgroundColor: 'rgba(255,255,255,0.75)',
//             borderRadius: tokens.borderRadius.lg,
//             borderWidth: tokens.borderWidth.hairline,
//             borderColor: 'black',
//             paddingVertical: 8,
//             paddingHorizontal: 14,
//           }}>
//           <Text
//             style={{
//               color: 'black',
//               fontWeight: '700',
//               fontSize: 13,
//               letterSpacing: 0.2,
//             }}>
//             Similar Items →
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* 🧾 Card Body */}
//       <View
//         style={{
//           paddingHorizontal: tokens.spacing.xsm,
//           paddingVertical: tokens.spacing.xxs,
//         }}>
//         <Text
//           numberOfLines={1}
//           style={{
//             color: theme.colors.foreground,
//             fontWeight: '400',
//             fontSize: 13,
//           }}>
//           {item.name}
//         </Text>

//         {item.brand && (
//           <Text
//             numberOfLines={1}
//             style={{
//               color: theme.colors.foreground,
//               opacity: 0.7,
//               fontSize: 11,
//               marginTop: 6,
//             }}>
//             {item.brand}
//           </Text>
//         )}

//         {item.price && (
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               fontWeight: '700',
//               fontSize: 13,
//               marginTop: 6,
//             }}>
//             {item.price}
//           </Text>
//         )}

//         {/* {item.source && (
//           <Text
//             numberOfLines={1}
//             style={{
//               color: theme.colors.foreground,
//               opacity: 0.6,
//               fontSize: 11,
//               marginTop: 2,
//             }}>
//             Source: {item.source}
//           </Text>
//         )} */}

//         {/* 🛍️ Shop CTA */}
//         {isRecommended && (
//           <TouchableOpacity
//             onPress={() => openShopModal(item.shopUrl)}
//             activeOpacity={0.85}
//             style={{
//               marginTop: 10,
//               backgroundColor: theme.colors.surface2,
//               borderRadius: tokens.borderRadius.lg,
//               alignItems: 'center',
//               justifyContent: 'center',
//               paddingVertical: 6,
//               borderWidth: tokens.borderWidth.hairline,
//               borderColor: theme.colors.surfaceBorder,
//             }}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '600',
//                 fontSize: 13,
//               }}>
//               {item.shopUrl ? 'Shop Similar →' : 'View Details'}
//             </Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </Animatable.View>
//   );

//   // 🧊 Entire screen wrapped in modal like ShopModal
//   return (
//     <Modal visible animationType="fade" transparent>
//       <View
//         style={{
//           flex: 1,
//           backgroundColor: 'rgba(0,0,0,0.5)',
//           justifyContent: 'center',
//           alignItems: 'center',
//           paddingVertical: tokens.spacing.sm,
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           duration={300}
//           style={{
//             width: '100%',
//             maxWidth: 700,
//             height: '90%',
//             backgroundColor: theme.colors.background,
//             borderRadius: tokens.borderRadius['2xl'],
//             overflow: 'hidden',
//             // paddingTop: insets.top + 20,
//             paddingHorizontal: tokens.spacing.md,
//           }}>
//           {/* ❌ Close */}
//           <TouchableOpacity
//             onPress={handleBack}
//             style={{
//               position: 'absolute',
//               top: 10,
//               right: 20,
//               zIndex: 10,
//               backgroundColor: theme.colors.foreground,
//               borderRadius: 24,
//               padding: 6,
//             }}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.background}
//             />
//           </TouchableOpacity>

//           {/* Main Scroll */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={[
//               globalStyles.centeredSection,
//               {paddingTop: 20, paddingBottom: 100},
//             ]}>
//             <Text
//               style={[
//                 globalStyles.sectionTitle,
//                 {marginBottom: 8, textAlign: 'left'},
//               ]}>
//               Recreated Look
//             </Text>

//             {/* 👕 Owned */}
//             {owned.length > 0 && (
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'space-between',
//                 }}>
//                 {owned.map((item, idx) => renderCard(item, idx))}
//               </View>
//             )}

//             {/* 🛍️ Recommended */}
//             {recommendations.length > 0 && (
//               <>
//                 <Text
//                   style={[
//                     globalStyles.sectionTitle,
//                     {fontSize: 20, marginTop: 30, marginBottom: 10},
//                   ]}>
//                   🛍️ Recommended to Add
//                 </Text>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                   }}>
//                   {recommendations.map((item, idx) =>
//                     renderCard(item, idx, true),
//                   )}
//                 </View>
//               </>
//             )}

//             {/* 🪞 Empty */}
//             {owned.length === 0 && recommendations.length === 0 && (
//               <View style={{alignItems: 'center', marginTop: 50}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     opacity: 0.7,
//                     fontSize: 16,
//                   }}>
//                   No outfit data found. Try recreating another look.
//                 </Text>
//               </View>
//             )}
//           </ScrollView>

//           {/* 🌐 SHOP MODAL */}
//           <Modal
//             visible={!!shopUrl}
//             animationType="fade"
//             transparent
//             onRequestClose={closeShopModal}>
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: 'rgba(0,0,0,0.6)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 padding: tokens.spacing.sm,
//               }}>
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={250}
//                 style={{
//                   width: '100%',
//                   maxWidth: 700,
//                   height: '90%',
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 {/* Close */}
//                 <TouchableOpacity
//                   onPress={closeShopModal}
//                   style={{
//                     position: 'absolute',
//                     top: 10,
//                     right: 20,
//                     zIndex: 999,
//                     backgroundColor: theme.colors.foreground,
//                     borderRadius: 24,
//                     padding: 6,
//                   }}>
//                   <MaterialIcons
//                     name="close"
//                     size={22}
//                     color={theme.colors.background}
//                   />
//                 </TouchableOpacity>

//                 {shopUrl ? (
//                   <WebView
//                     source={{uri: shopUrl}}
//                     startInLoadingState
//                     style={{flex: 1, backgroundColor: theme.colors.surface}}
//                   />
//                 ) : (
//                   <View
//                     style={{
//                       flex: 1,
//                       justifyContent: 'center',
//                       alignItems: 'center',
//                     }}>
//                     <ActivityIndicator
//                       size="large"
//                       color={theme.colors.primary}
//                     />
//                   </View>
//                 )}
//               </Animatable.View>
//             </View>
//           </Modal>

//           {/* 🔍 SIMILAR LOOKS MODAL */}
//           <Modal visible={showSimilarModal} animationType="fade" transparent>
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: 'rgba(0,0,0,0.1)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 paddingVertical: tokens.spacing.sm,
//               }}>
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={250}
//                 style={{
//                   width: '100%',
//                   maxWidth: '100%',
//                   height: '90%',
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.background,
//                   padding: tokens.spacing.md,
//                 }}>
//                 {/* Close */}
//                 <TouchableOpacity
//                   onPress={closeAllModals}
//                   style={{
//                     position: 'absolute',
//                     top: 10,
//                     right: 20,
//                     zIndex: 999,
//                     backgroundColor: theme.colors.foreground,
//                     borderRadius: 24,
//                     padding: 6,
//                   }}>
//                   <MaterialIcons
//                     name="close"
//                     size={22}
//                     color={theme.colors.background}
//                   />
//                 </TouchableOpacity>

//                 {loading ? (
//                   <View
//                     style={{
//                       flex: 1,
//                       justifyContent: 'center',
//                       alignItems: 'center',
//                     }}>
//                     <ActivityIndicator
//                       size="large"
//                       color={theme.colors.primary}
//                     />
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         marginTop: 12,
//                         opacity: 0.7,
//                       }}>
//                       Finding similar looks...
//                     </Text>
//                   </View>
//                 ) : (
//                   <ScrollView showsVerticalScrollIndicator={false}>
//                     <Text
//                       style={[
//                         globalStyles.sectionTitle,
//                         {fontSize: 20, marginBottom: 10},
//                       ]}>
//                       Similar Items
//                     </Text>

//                     {data.length === 0 ? (
//                       <View style={{alignItems: 'center', marginTop: 40}}>
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.7,
//                           }}>
//                           No similar items found.
//                         </Text>
//                       </View>
//                     ) : (
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           flexWrap: 'wrap',
//                           justifyContent: 'space-between',
//                           backgroundColor: theme.colors.background,
//                         }}>
//                         {data.map((look, idx) => (
//                           <TouchableOpacity
//                             key={idx}
//                             activeOpacity={0.85}
//                             onPress={() => {
//                               ReactNativeHapticFeedback.trigger('impactMedium');
//                               setShowSimilarModal(false);
//                               setTimeout(() => openShopModal(look.link), 300);
//                             }}
//                             style={{
//                               width: '49.0%',
//                               marginBottom: tokens.spacing.xsm,
//                               backgroundColor: theme.colors.surface,
//                               borderWidth: tokens.borderWidth.md,
//                               borderColor: theme.colors.surfaceBorder,
//                               borderRadius: tokens.borderRadius.lg,
//                               overflow: 'hidden',
//                             }}>
//                             {/* 🖼️ Product Image (fills entire card) */}
//                             <View
//                               style={{
//                                 width: '100%',
//                                 aspectRatio: 3 / 4,
//                                 backgroundColor: theme.colors.surface,
//                                 overflow: 'hidden',
//                               }}>
//                               <Image
//                                 source={{
//                                   uri:
//                                     look.image ||
//                                     'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//                                 }}
//                                 style={{
//                                   width: '100%',
//                                   height: '100%',
//                                   position: 'absolute',
//                                 }}
//                                 resizeMode="cover" // ✅ fills the container, cropping edges if needed
//                               />

//                               {/* 🛒 Click to Buy Button Overlay */}
//                               <View
//                                 style={{
//                                   position: 'absolute',
//                                   bottom: 10,
//                                   alignSelf: 'center',
//                                   backgroundColor: 'rgba(255,255,255,0.75)',
//                                   borderRadius: tokens.borderRadius.lg,
//                                   borderWidth: tokens.borderWidth.hairline,
//                                   borderColor: 'black',
//                                   paddingVertical: 8,
//                                   paddingHorizontal: 14,
//                                 }}>
//                                 <Text
//                                   style={{
//                                     color: 'black',
//                                     fontWeight: '700',
//                                     fontSize: 13,
//                                     letterSpacing: 0.2,
//                                   }}>
//                                   Click to Buy →
//                                 </Text>
//                               </View>
//                             </View>

//                             {/* 🧾 Product Info Section */}
//                             <View style={{padding: 8}}>
//                               {/* Title */}
//                               <Text
//                                 numberOfLines={1}
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '400',
//                                   fontSize: 13,
//                                 }}>
//                                 {look.title || 'Similar look'}
//                               </Text>

//                               {/* Brand */}
//                               {look.brand ? (
//                                 <Text
//                                   numberOfLines={1}
//                                   style={{
//                                     color: theme.colors.foreground,
//                                     opacity: 0.7,
//                                     fontSize: 11,
//                                     marginTop: 6,
//                                   }}>
//                                   {look.brand}
//                                 </Text>
//                               ) : null}

//                               {/* Price — reserve height even if missing */}

//                               {look.price ? (
//                                 <Text
//                                   numberOfLines={1}
//                                   style={{
//                                     fontWeight: '700',
//                                     fontSize: 13,
//                                     marginTop: 6,
//                                     color: theme.colors.foreground,
//                                   }}>
//                                   {look.price}
//                                 </Text>
//                               ) : (
//                                 <Text
//                                   style={{
//                                     opacity: 0,
//                                     fontSize: 13,
//                                     fontWeight: '700',
//                                   }}>
//                                   placeholder
//                                 </Text>
//                               )}

//                               {/* Source */}
//                               {/* {look.source ? (
//                                 <Text
//                                   numberOfLines={1}
//                                   style={{
//                                     color: theme.colors.foreground,
//                                     opacity: 0.6,
//                                     fontSize: 10,
//                                     marginTop: 2,
//                                   }}>
//                                   Source: {look.source}
//                                 </Text>
//                               ) : null} */}
//                             </View>
//                           </TouchableOpacity>
//                         ))}
//                       </View>
//                     )}
//                   </ScrollView>
//                 )}
//               </Animatable.View>
//             </View>
//           </Modal>
//         </Animatable.View>
//       </View>
//     </Modal>
//   );
// }

///////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
//   ActivityIndicator,
//   Dimensions,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {WebView} from 'react-native-webview';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../styles/tokens/tokens';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useSimilarLooks} from '../hooks/useSimilarLooks';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';

// const {width} = Dimensions.get('window');
// const CARD_WIDTH = width / 2 - tokens.spacing.md * 1.5;

// type WardrobeItem = {
//   id: string;
//   name: string;
//   image?: string;
//   brand?: string;
//   price?: string;
//   source?: string;
//   shopUrl?: string;
// };

// type Props = {
//   route: {
//     params: {
//       data: {
//         owned?: WardrobeItem[];
//         recommendations?: WardrobeItem[];
//         outfit?: WardrobeItem[];
//       };
//     };
//   };
//   navigation: any;
// };

// export default function RecreatedLookScreen({route, navigation}: Props) {
//   const insets = useSafeAreaInsets();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {outfit = [], recommendations = []} = route.params?.data || {};
//   const owned = outfit.length ? outfit : route.params?.data?.owned || [];
//   const {fetchSimilar, data, loading} = useSimilarLooks();

//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const [showSimilarModal, setShowSimilarModal] = useState(false);
//   const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   const closeAllModals = () => {
//     if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
//     setShowSimilarModal(false);
//     setShopUrl(null);
//   };

//   const handleBack = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     navigation.goBack();
//   };

//   const openShopModal = (url?: string) => {
//     if (!url) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     setShowSimilarModal(false);
//     if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
//     closeTimeoutRef.current = setTimeout(() => setShopUrl(url), 250);
//   };

//   const closeShopModal = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     setShopUrl(null);
//   };

//   const renderCard = (
//     item: WardrobeItem,
//     idx: number,
//     isRecommended = false,
//   ) => (
//     <Animatable.View
//       key={item.id + idx}
//       animation="fadeInUp"
//       delay={idx * 80}
//       duration={400}
//       style={{
//         width: '48%',
//         marginBottom: tokens.spacing.md,
//         backgroundColor: theme.colors.surface2,
//         borderRadius: tokens.borderRadius.lg,
//         overflow: 'hidden',
//         borderColor: theme.colors.muted,
//         borderWidth: tokens.borderWidth.md,
//       }}>
//       <TouchableOpacity
//         activeOpacity={0.85}
//         onPress={() => {
//           ReactNativeHapticFeedback.trigger('impactMedium');
//           fetchSimilar(item.image);
//           setShowSimilarModal(true);
//         }}>
//         <Image
//           source={{
//             uri:
//               item.image ||
//               'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//           }}
//           style={{
//             width: '100%',
//             height: 180,
//             borderTopLeftRadius: tokens.borderRadius.lg,
//             borderTopRightRadius: tokens.borderRadius.lg,
//             backgroundColor: theme.colors.surface,
//           }}
//           resizeMode="cover"
//         />
//       </TouchableOpacity>

//       <View style={{padding: 8}}>
//         <Text
//           numberOfLines={1}
//           style={{
//             color: theme.colors.foreground,
//             fontWeight: '600',
//             fontSize: 13,
//           }}>
//           {item.name}
//         </Text>

//         {item.brand && (
//           <Text
//             numberOfLines={1}
//             style={{
//               color: theme.colors.foreground,
//               opacity: 0.7,
//               fontSize: 11,
//               marginTop: 2,
//             }}>
//             {item.brand}
//           </Text>
//         )}

//         {item.price && (
//           <Text
//             style={{
//               color: theme.colors.primary,
//               fontWeight: '600',
//               fontSize: 13,
//               marginTop: 4,
//             }}>
//             {item.price}
//           </Text>
//         )}

//         {item.source && (
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               opacity: 0.6,
//               fontSize: 10,
//               marginTop: 2,
//             }}>
//             Source: {item.source}
//           </Text>
//         )}

//         {isRecommended && (
//           <TouchableOpacity
//             onPress={() => openShopModal(item.shopUrl)}
//             activeOpacity={0.85}
//             style={{
//               marginTop: 8,
//               backgroundColor: theme.colors.button1,
//               borderRadius: tokens.borderRadius.lg,
//               alignItems: 'center',
//               justifyContent: 'center',
//               paddingVertical: 6,
//             }}>
//             <Text
//               style={{
//                 color: theme.colors.buttonText1,
//                 fontWeight: '600',
//                 fontSize: 13,
//               }}>
//               {item.shopUrl ? 'Shop Similar →' : 'View Details'}
//             </Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </Animatable.View>
//   );

//   // 🧊 Wrap screen in modal like ShopModal
//   return (
//     <Modal visible animationType="fade" transparent>
//       <View
//         style={{
//           flex: 1,
//           backgroundColor: 'rgba(0,0,0,0.5)',
//           justifyContent: 'center',
//           alignItems: 'center',
//           padding: tokens.spacing.sm,
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           duration={300}
//           style={{
//             width: '100%',
//             maxWidth: 700,
//             height: '90%',
//             backgroundColor: theme.colors.surface,
//             borderRadius: tokens.borderRadius['2xl'],
//             overflow: 'hidden',
//             paddingTop: insets.top + 20,
//             paddingHorizontal: tokens.spacing.md,
//           }}>
//           {/* ❌ Close */}
//           <TouchableOpacity
//             onPress={handleBack}
//             style={{
//               position: 'absolute',
//               top: 10,
//               right: 20,
//               zIndex: 10,
//               backgroundColor: theme.colors.foreground,
//               borderRadius: 24,
//               padding: 6,
//             }}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.background}
//             />
//           </TouchableOpacity>

//           {/* Main Scroll */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={[
//               globalStyles.centeredSection,
//               {paddingTop: 10, paddingBottom: 100},
//             ]}>
//             <Text
//               style={[
//                 globalStyles.sectionTitle,
//                 {marginBottom: 20, textAlign: 'center'},
//               ]}>
//               Recreated Look
//             </Text>

//             {/* 👕 Owned */}
//             {owned.length > 0 && (
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'space-between',
//                 }}>
//                 {owned.map((item, idx) => renderCard(item, idx))}
//               </View>
//             )}

//             {/* 🛍️ Recommended */}
//             {recommendations.length > 0 && (
//               <>
//                 <Text
//                   style={[
//                     globalStyles.sectionTitle,
//                     {fontSize: 20, marginTop: 30, marginBottom: 10},
//                   ]}>
//                   🛍️ Recommended to Add
//                 </Text>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                   }}>
//                   {recommendations.map((item, idx) =>
//                     renderCard(item, idx, true),
//                   )}
//                 </View>
//               </>
//             )}

//             {/* 🪞 Empty */}
//             {owned.length === 0 && recommendations.length === 0 && (
//               <View style={{alignItems: 'center', marginTop: 50}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     opacity: 0.7,
//                     fontSize: 16,
//                   }}>
//                   No outfit data found. Try recreating another look.
//                 </Text>
//               </View>
//             )}
//           </ScrollView>

//           {/* 🌐 SHOP MODAL */}
//           <Modal
//             visible={!!shopUrl}
//             animationType="fade"
//             transparent
//             onRequestClose={closeShopModal}>
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: 'rgba(0,0,0,0.6)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 padding: tokens.spacing.sm,
//               }}>
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={250}
//                 style={{
//                   width: '100%',
//                   maxWidth: 700,
//                   height: '90%',
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.surface,
//                 }}>
//                 {/* Close */}
//                 <TouchableOpacity
//                   onPress={closeShopModal}
//                   style={{
//                     position: 'absolute',
//                     top: 10,
//                     right: 20,
//                     zIndex: 999,
//                     backgroundColor: theme.colors.foreground,
//                     borderRadius: 24,
//                     padding: 6,
//                   }}>
//                   <MaterialIcons
//                     name="close"
//                     size={22}
//                     color={theme.colors.background}
//                   />
//                 </TouchableOpacity>

//                 {shopUrl ? (
//                   <WebView
//                     source={{uri: shopUrl}}
//                     startInLoadingState
//                     style={{flex: 1, backgroundColor: theme.colors.surface}}
//                   />
//                 ) : (
//                   <View
//                     style={{
//                       flex: 1,
//                       justifyContent: 'center',
//                       alignItems: 'center',
//                     }}>
//                     <ActivityIndicator
//                       size="large"
//                       color={theme.colors.primary}
//                     />
//                   </View>
//                 )}
//               </Animatable.View>
//             </View>
//           </Modal>

//           {/* 🔍 SIMILAR LOOKS MODAL */}
//           <Modal visible={showSimilarModal} animationType="fade" transparent>
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: 'rgba(0,0,0,0.4)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 padding: tokens.spacing.sm,
//               }}>
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={250}
//                 style={{
//                   width: '100%',
//                   maxWidth: 700,
//                   height: '90%',
//                   borderRadius: tokens.borderRadius['2xl'],
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.surface,
//                   padding: tokens.spacing.md,
//                 }}>
//                 {/* Close */}
//                 <TouchableOpacity
//                   onPress={closeAllModals}
//                   style={{
//                     position: 'absolute',
//                     top: 10,
//                     right: 20,
//                     zIndex: 999,
//                     backgroundColor: theme.colors.foreground,
//                     borderRadius: 24,
//                     padding: 6,
//                   }}>
//                   <MaterialIcons
//                     name="close"
//                     size={22}
//                     color={theme.colors.background}
//                   />
//                 </TouchableOpacity>

//                 {loading ? (
//                   <View
//                     style={{
//                       flex: 1,
//                       justifyContent: 'center',
//                       alignItems: 'center',
//                     }}>
//                     <ActivityIndicator
//                       size="large"
//                       color={theme.colors.primary}
//                     />
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         marginTop: 12,
//                         opacity: 0.7,
//                       }}>
//                       Finding similar looks...
//                     </Text>
//                   </View>
//                 ) : (
//                   <ScrollView showsVerticalScrollIndicator={false}>
//                     <Text
//                       style={[
//                         globalStyles.sectionTitle,
//                         {fontSize: 20, marginBottom: 20},
//                       ]}>
//                       Similar Looks
//                     </Text>

//                     {data.length === 0 ? (
//                       <View style={{alignItems: 'center', marginTop: 40}}>
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.7,
//                           }}>
//                           No similar looks found.
//                         </Text>
//                       </View>
//                     ) : (
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           flexWrap: 'wrap',
//                           justifyContent: 'space-between',
//                         }}>
//                         {data.map((look, idx) => (
//                           <TouchableOpacity
//                             key={idx}
//                             activeOpacity={0.85}
//                             onPress={() => {
//                               ReactNativeHapticFeedback.trigger('impactMedium');
//                               setShowSimilarModal(false);
//                               setTimeout(() => openShopModal(look.link), 300);
//                             }}
//                             style={{
//                               width: '48%',
//                               marginBottom: tokens.spacing.md,
//                               backgroundColor: theme.colors.surface2,
//                               borderRadius: tokens.borderRadius.lg,
//                               overflow: 'hidden',
//                               borderColor: theme.colors.muted,
//                               borderWidth: tokens.borderWidth.md,
//                             }}>
//                             <Image
//                               source={{
//                                 uri:
//                                   look.image ||
//                                   'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//                               }}
//                               style={{
//                                 width: '100%',
//                                 height: 180,
//                                 borderTopLeftRadius: tokens.borderRadius.lg,
//                                 borderTopRightRadius: tokens.borderRadius.lg,
//                               }}
//                               resizeMode="cover"
//                             />
//                             <View style={{padding: 8}}>
//                               <Text
//                                 numberOfLines={1}
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                 }}>
//                                 {look.title || 'Similar look'}
//                               </Text>
//                             </View>
//                           </TouchableOpacity>
//                         ))}
//                       </View>
//                     )}
//                   </ScrollView>
//                 )}
//               </Animatable.View>
//             </View>
//           </Modal>
//         </Animatable.View>
//       </View>
//     </Modal>
//   );
// }

/////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   Modal,
//   ActivityIndicator,
//   SafeAreaView,
//   Dimensions,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {WebView} from 'react-native-webview';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../styles/tokens/tokens';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useSimilarLooks} from '../hooks/useSimilarLooks';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';

// const {width} = Dimensions.get('window');
// const CARD_WIDTH = width / 2 - tokens.spacing.md * 1.5;

// type WardrobeItem = {
//   id: string;
//   name: string;
//   image?: string;
//   brand?: string;
//   price?: string;
//   source?: string;
//   shopUrl?: string;
// };

// type Props = {
//   route: {
//     params: {
//       data: {
//         owned?: WardrobeItem[];
//         recommendations?: WardrobeItem[];
//         outfit?: WardrobeItem[];
//       };
//     };
//   };
//   navigation: any;
// };

// export default function RecreatedLookScreen({route, navigation}: Props) {
//   const insets = useSafeAreaInsets();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {outfit = [], recommendations = []} = route.params?.data || {};
//   const owned = outfit.length ? outfit : route.params?.data?.owned || [];
//   const {fetchSimilar, data, loading} = useSimilarLooks();

//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const [showSimilarModal, setShowSimilarModal] = useState(false);
//   const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   const closeAllModals = () => {
//     if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
//     setShowSimilarModal(false);
//     setShopUrl(null);
//   };

//   const handleBack = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     navigation.goBack();
//   };

//   const openShopModal = (url?: string) => {
//     if (!url) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     setShowSimilarModal(false);
//     if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
//     closeTimeoutRef.current = setTimeout(() => setShopUrl(url), 250);
//   };

//   const closeShopModal = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     setShopUrl(null);
//   };

//   const renderCard = (
//     item: WardrobeItem,
//     idx: number,
//     isRecommended = false,
//   ) => (
//     <Animatable.View
//       key={item.id + idx}
//       animation="fadeInUp"
//       delay={idx * 80}
//       duration={400}
//       style={{
//         width: '48%',
//         marginBottom: tokens.spacing.md,
//         backgroundColor: theme.colors.surface2,
//         borderRadius: tokens.borderRadius.lg,
//         overflow: 'hidden',
//         borderColor: theme.colors.muted,
//         borderWidth: tokens.borderWidth.md,
//       }}>
//       <TouchableOpacity
//         activeOpacity={0.85}
//         onPress={() => {
//           ReactNativeHapticFeedback.trigger('impactMedium');
//           fetchSimilar(item.image);
//           setShowSimilarModal(true);
//         }}>
//         <Image
//           source={{
//             uri:
//               item.image ||
//               'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//           }}
//           style={{
//             width: '100%',
//             height: 180,
//             borderTopLeftRadius: tokens.borderRadius.lg,
//             borderTopRightRadius: tokens.borderRadius.lg,
//             backgroundColor: theme.colors.surface,
//           }}
//           resizeMode="cover"
//         />
//       </TouchableOpacity>

//       <View style={{padding: 8}}>
//         <Text
//           numberOfLines={1}
//           style={{
//             color: theme.colors.foreground,
//             fontWeight: '600',
//             fontSize: 13,
//           }}>
//           {item.name}
//         </Text>

//         {item.brand && (
//           <Text
//             numberOfLines={1}
//             style={{
//               color: theme.colors.foreground,
//               opacity: 0.7,
//               fontSize: 11,
//               marginTop: 2,
//             }}>
//             {item.brand}
//           </Text>
//         )}

//         {item.price && (
//           <Text
//             style={{
//               color: theme.colors.primary,
//               fontWeight: '600',
//               fontSize: 13,
//               marginTop: 4,
//             }}>
//             {item.price}
//           </Text>
//         )}

//         {item.source && (
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               opacity: 0.6,
//               fontSize: 10,
//               marginTop: 2,
//             }}>
//             Source: {item.source}
//           </Text>
//         )}

//         {isRecommended && (
//           <TouchableOpacity
//             onPress={() => openShopModal(item.shopUrl)}
//             activeOpacity={0.85}
//             style={{
//               marginTop: 8,
//               backgroundColor: theme.colors.button1,
//               borderRadius: tokens.borderRadius.lg,
//               alignItems: 'center',
//               justifyContent: 'center',
//               paddingVertical: 6,
//             }}>
//             <Text
//               style={{
//                 color: theme.colors.buttonText1,
//                 fontWeight: '600',
//                 fontSize: 13,
//               }}>
//               {item.shopUrl ? 'Shop Similar →' : 'View Details'}
//             </Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </Animatable.View>
//   );

//   return (
//     <SafeAreaView
//       style={{
//         flex: 1,
//         backgroundColor: theme.colors.background,
//         paddingTop: insets.top + 30,
//         paddingHorizontal: tokens.spacing.md,
//       }}>
//       {/* ❌ Close */}
//       <TouchableOpacity
//         onPress={handleBack}
//         style={{
//           position: 'absolute',
//           top: 0,
//           right: 20,
//           zIndex: 10,
//           backgroundColor: theme.colors.foreground,
//           borderRadius: 24,
//           padding: 6,
//         }}>
//         <MaterialIcons name="close" size={22} color={theme.colors.background} />
//       </TouchableOpacity>

//       {/* Main Scroll */}
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={[
//           globalStyles.centeredSection,
//           {paddingTop: 10, paddingBottom: 100},
//         ]}>
//         <Text style={[globalStyles.sectionTitle, {marginBottom: 20}]}>
//           Recreated Look
//         </Text>

//         {/* 👕 Owned */}
//         {owned.length > 0 && (
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               justifyContent: 'space-between',
//             }}>
//             {owned.map((item, idx) => renderCard(item, idx))}
//           </View>
//         )}

//         {/* 🛍️ Recommended */}
//         {recommendations.length > 0 && (
//           <>
//             <Text
//               style={[
//                 globalStyles.sectionTitle,
//                 {fontSize: 20, marginTop: 30, marginBottom: 10},
//               ]}>
//               🛍️ Recommended to Add
//             </Text>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 flexWrap: 'wrap',
//                 justifyContent: 'space-between',
//               }}>
//               {recommendations.map((item, idx) => renderCard(item, idx, true))}
//             </View>
//           </>
//         )}

//         {/* 🪞 Empty */}
//         {owned.length === 0 && recommendations.length === 0 && (
//           <View style={{alignItems: 'center', marginTop: 50}}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 opacity: 0.7,
//                 fontSize: 16,
//               }}>
//               No outfit data found. Try recreating another look.
//             </Text>
//           </View>
//         )}
//       </ScrollView>

//       {/* 🌐 SHOP MODAL */}
//       <Modal
//         visible={!!shopUrl}
//         animationType="fade"
//         transparent
//         onRequestClose={closeShopModal}>
//         <View
//           style={{
//             flex: 1,
//             backgroundColor: 'rgba(0,0,0,0.6)',
//             justifyContent: 'center',
//             alignItems: 'center',
//             padding: tokens.spacing.sm,
//           }}>
//           <Animatable.View
//             animation="fadeInUp"
//             duration={250}
//             style={{
//               width: '100%',
//               maxWidth: 700,
//               height: '90%',
//               borderRadius: tokens.borderRadius['2xl'],
//               overflow: 'hidden',
//               backgroundColor: theme.colors.surface,
//             }}>
//             {/* Close */}
//             <TouchableOpacity
//               onPress={closeShopModal}
//               style={{
//                 position: 'absolute',
//                 top: 10,
//                 right: 20,
//                 zIndex: 999,
//                 backgroundColor: theme.colors.foreground,
//                 borderRadius: 24,
//                 padding: 6,
//               }}>
//               <MaterialIcons
//                 name="close"
//                 size={22}
//                 color={theme.colors.background}
//               />
//             </TouchableOpacity>

//             {shopUrl ? (
//               <WebView
//                 source={{uri: shopUrl}}
//                 startInLoadingState
//                 style={{flex: 1, backgroundColor: theme.colors.surface}}
//               />
//             ) : (
//               <View
//                 style={{
//                   flex: 1,
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                 }}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//               </View>
//             )}
//           </Animatable.View>
//         </View>
//       </Modal>

//       {/* 🔍 SIMILAR LOOKS MODAL */}
//       <Modal visible={showSimilarModal} animationType="fade" transparent>
//         <View
//           style={{
//             flex: 1,
//             backgroundColor: 'rgba(0,0,0,0.4)',
//             justifyContent: 'center',
//             alignItems: 'center',
//             padding: tokens.spacing.sm,
//           }}>
//           <Animatable.View
//             animation="fadeInUp"
//             duration={250}
//             style={{
//               width: '100%',
//               maxWidth: 700,
//               height: '90%',
//               borderRadius: tokens.borderRadius['2xl'],
//               overflow: 'hidden',
//               backgroundColor: theme.colors.surface,
//               padding: tokens.spacing.md,
//             }}>
//             {/* Close */}
//             <TouchableOpacity
//               onPress={closeAllModals}
//               style={{
//                 position: 'absolute',
//                 top: 10,
//                 right: 20,
//                 zIndex: 999,
//                 backgroundColor: theme.colors.foreground,
//                 borderRadius: 24,
//                 padding: 6,
//               }}>
//               <MaterialIcons
//                 name="close"
//                 size={22}
//                 color={theme.colors.background}
//               />
//             </TouchableOpacity>

//             {loading ? (
//               <View
//                 style={{
//                   flex: 1,
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                 }}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                   }}>
//                   Finding similar looks...
//                 </Text>
//               </View>
//             ) : (
//               <ScrollView showsVerticalScrollIndicator={false}>
//                 <Text
//                   style={[
//                     globalStyles.sectionTitle,
//                     {fontSize: 20, marginBottom: 20},
//                   ]}>
//                   Similar Looks
//                 </Text>

//                 {data.length === 0 ? (
//                   <View style={{alignItems: 'center', marginTop: 40}}>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         opacity: 0.7,
//                       }}>
//                       No similar looks found.
//                     </Text>
//                   </View>
//                 ) : (
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       justifyContent: 'space-between',
//                     }}>
//                     {data.map((look, idx) => (
//                       <TouchableOpacity
//                         key={idx}
//                         activeOpacity={0.85}
//                         onPress={() => {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           setShowSimilarModal(false);
//                           setTimeout(() => openShopModal(look.link), 300);
//                         }}
//                         style={{
//                           width: '48%',
//                           marginBottom: tokens.spacing.md,
//                           backgroundColor: theme.colors.surface2,
//                           borderRadius: tokens.borderRadius.lg,
//                           overflow: 'hidden',
//                           borderColor: theme.colors.muted,
//                           borderWidth: tokens.borderWidth.md,
//                         }}>
//                         <Image
//                           source={{
//                             uri:
//                               look.image ||
//                               'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//                           }}
//                           style={{
//                             width: '100%',
//                             height: 180,
//                             borderTopLeftRadius: tokens.borderRadius.lg,
//                             borderTopRightRadius: tokens.borderRadius.lg,
//                           }}
//                           resizeMode="cover"
//                         />
//                         <View style={{padding: 8}}>
//                           <Text
//                             numberOfLines={1}
//                             style={{
//                               color: theme.colors.foreground,
//                               fontWeight: '600',
//                               fontSize: 13,
//                             }}>
//                             {look.title || 'Similar look'}
//                           </Text>
//                         </View>
//                       </TouchableOpacity>
//                     ))}
//                   </View>
//                 )}
//               </ScrollView>
//             )}
//           </Animatable.View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

///////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
//   ActivityIndicator,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {WebView} from 'react-native-webview';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import FrostedCard from '../components/FrostedCard/FrostedCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useSimilarLooks} from '../hooks/useSimilarLooks';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

// const {width} = Dimensions.get('window');
// const CARD_SIZE = width / 2 - tokens.spacing.md * 1.5;

// type WardrobeItem = {
//   id: string;
//   name: string;
//   image?: string;
//   color?: string;
//   brand?: string;
//   shopUrl?: string;
// };

// type Props = {
//   route: {
//     params: {
//       data: {
//         owned?: WardrobeItem[];
//         recommendations?: WardrobeItem[];
//         outfit?: WardrobeItem[];
//       };
//     };
//   };
//   navigation: any;
// };

// export default function RecreatedLookScreen({route, navigation}: Props) {
//   const insets = useSafeAreaInsets(); // 👈 add this
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const {centeredSection} = useGlobalStyles();
//   const {outfit = [], recommendations = []} = route.params?.data || {};
//   const owned = outfit.length ? outfit : route.params?.data?.owned || [];

//   const {fetchSimilar, data, loading} = useSimilarLooks();

//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const [showSimilarModal, setShowSimilarModal] = useState(false);
//   const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   /** Ensures all modals are closed safely */
//   const closeAllModals = () => {
//     if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
//     setShowSimilarModal(false);
//     setShopUrl(null);
//   };

//   const handleBack = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     navigation.goBack();
//   };

//   const openShopModal = (url?: string) => {
//     if (!url) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     // Close similar modal first if open
//     setShowSimilarModal(false);
//     if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
//     // Delay to avoid race condition
//     closeTimeoutRef.current = setTimeout(() => {
//       setShopUrl(url);
//     }, 250);
//   };

//   const closeShopModal = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     setShopUrl(null);
//   };

//   const renderCard = (
//     item: WardrobeItem,
//     index: number,
//     isRecommended = false,
//   ) => (
//     <Animatable.View
//       key={item.id + index}
//       animation="fadeInUp"
//       delay={index * 80}
//       duration={400}
//       style={{
//         marginBottom: tokens.spacing.lg,
//         width: CARD_SIZE,
//         height: CARD_SIZE * 1.35,
//       }}>
//       <FrostedCard style={{flex: 1, overflow: 'hidden'}}>
//         <Image
//           source={{
//             uri:
//               item.image ||
//               'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//           }}
//           style={{width: '100%', height: '100%'}}
//           resizeMode="cover"
//         />
//       </FrostedCard>

//       {/* 👀 See Similar Looks Button */}
//       <TouchableOpacity
//         activeOpacity={0.85}
//         onPress={() => {
//           closeAllModals();
//           ReactNativeHapticFeedback.trigger('impactMedium');
//           fetchSimilar(item.image);
//           setShowSimilarModal(true);
//         }}
//         style={{
//           position: 'absolute',
//           bottom: 45,
//           left: '15%',
//           right: '5%',
//           backgroundColor: theme.colors.button1,
//           borderRadius: tokens.borderRadius.lg,
//           paddingVertical: 6,
//           alignItems: 'center',
//           justifyContent: 'center',
//           borderWidth: tokens.borderWidth.hairline,
//           borderColor: theme.colors.surfaceBorder,
//           width: 130,
//         }}>
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             fontWeight: '600',
//             fontSize: 13,
//           }}>
//           Similar Looks →
//         </Text>
//       </TouchableOpacity>

//       <View style={{marginTop: 6}}>
//         <Text
//           numberOfLines={1}
//           style={{
//             color: theme.colors.foreground,
//             fontWeight: '600',
//             fontSize: 14,
//           }}>
//           {item.name}
//         </Text>
//         {item.brand && (
//           <Text
//             numberOfLines={1}
//             style={{
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               marginTop: 2,
//             }}>
//             {item.brand}
//           </Text>
//         )}
//       </View>

//       {/* 🛍️ Shop Similar CTA */}
//       {isRecommended && (
//         <TouchableOpacity
//           activeOpacity={0.85}
//           onPress={() => openShopModal(item.shopUrl)}
//           style={{
//             marginTop: 8,
//             backgroundColor: theme.colors.surface2,
//             paddingVertical: 6,
//             borderRadius: 12,
//             alignItems: 'center',
//             justifyContent: 'center',
//             borderWidth: tokens.borderWidth.hairline,
//             borderColor: theme.colors.surfaceBorder,
//           }}>
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               fontWeight: '600',
//               fontSize: 13,
//             }}>
//             {item.shopUrl ? 'Shop Similar →' : 'View Details'}
//           </Text>
//         </TouchableOpacity>
//       )}
//     </Animatable.View>
//   );

//   return (
//     <SafeAreaView
//       style={{
//         flex: 1,
//         backgroundColor: theme.colors.background,
//         paddingTop: insets.top + 30,
//         paddingHorizontal: 16,
//       }}>
//       {/* ❌ Close Button (top-right corner) */}
//       <View
//         style={{
//           position: 'absolute',
//           top: 70,
//           right: 20,
//           zIndex: 10,
//           backgroundColor: theme.colors.background,
//           borderRadius: 30,
//         }}>
//         <AppleTouchFeedback onPress={handleBack}>
//           <View style={{padding: 6}}>
//             <MaterialIcons
//               name="close"
//               color={theme.colors.foreground}
//               size={22}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* 🧥 Main Scroll */}
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={[
//           centeredSection,
//           {paddingTop: 14, paddingBottom: 120},
//         ]}>
//         <Text
//           style={{
//             fontSize: 28,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             marginBottom: tokens.spacing.sm,
//             textAlign: 'left',
//           }}>
//           Recreated Look
//         </Text>

//         {/* 👕 Owned */}
//         {owned.length > 0 && (
//           <>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 flexWrap: 'wrap',
//                 justifyContent: 'space-between',
//               }}>
//               {owned.map((item, idx) => renderCard(item, idx))}
//             </View>
//           </>
//         )}
//         {/* 🛍️ Recommended */}
//         {recommendations.length > 0 && (
//           <>
//             <Text
//               style={{
//                 fontSize: 20,
//                 fontWeight: '600',
//                 color: theme.colors.foreground,
//                 marginTop: tokens.spacing.xl,
//                 marginBottom: tokens.spacing.md,
//               }}>
//               🛍️ Recommended to Add
//             </Text>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 flexWrap: 'wrap',
//                 justifyContent: 'space-between',
//               }}>
//               {recommendations.map((item, idx) => renderCard(item, idx, true))}
//             </View>
//           </>
//         )}
//         {/* 🪞 Empty */}
//         {owned.length === 0 && recommendations.length === 0 && (
//           <View
//             style={{
//               alignItems: 'center',
//               justifyContent: 'center',
//               paddingVertical: 60,
//             }}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontSize: 16,
//                 textAlign: 'center',
//               }}>
//               No outfit data found. Try recreating another look.
//             </Text>
//           </View>
//         )}
//       </ScrollView>

//       {/* 🌐 SHOP MODAL */}
//       <Modal
//         visible={!!shopUrl}
//         animationType="fade"
//         transparent
//         onRequestClose={closeShopModal}>
//         <View
//           style={{
//             flex: 1,
//             backgroundColor: theme.colors.background,
//             justifyContent: 'center',
//             alignItems: 'center',
//             padding: tokens.spacing.sm,
//           }}>
//           <Animatable.View
//             animation="fadeInUp"
//             duration={250}
//             style={{
//               width: '100%',
//               maxWidth: 700,
//               height: '90%',
//               borderRadius: tokens.borderRadius['2xl'],
//               overflow: 'hidden',
//               backgroundColor: theme.colors.surface,
//             }}>
//             {/* ✅ Close Button — top layer */}
//             <View
//               pointerEvents="box-none"
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 right: 0,
//                 left: 0,
//                 height: 80,
//                 zIndex: 9999,
//                 elevation: 9999,
//                 alignItems: 'flex-end',
//                 justifyContent: 'flex-start',
//                 paddingTop: 16,
//                 paddingRight: 16,
//               }}>
//               <TouchableOpacity
//                 activeOpacity={0.7}
//                 onPress={() => {
//                   console.log('[❌ Shop modal close tapped]');
//                   ReactNativeHapticFeedback.trigger('impactLight');
//                   closeShopModal();
//                 }}
//                 hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
//                 style={{
//                   backgroundColor: 'rgba(0,0,0,0.6)',
//                   borderRadius: 30,
//                   padding: 8,
//                 }}>
//                 <MaterialIcons name="close" size={28} color="white" />
//               </TouchableOpacity>
//             </View>

//             {/* 🛍️ WebView (always behind the close button) */}
//             {shopUrl ? (
//               <WebView
//                 source={{uri: shopUrl}}
//                 startInLoadingState
//                 style={{flex: 1, backgroundColor: theme.colors.surface}}
//               />
//             ) : (
//               <View
//                 style={{
//                   flex: 1,
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                 }}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//               </View>
//             )}
//           </Animatable.View>
//         </View>
//       </Modal>

//       {/* 🔍 SIMILAR LOOKS MODAL */}
//       <Modal visible={showSimilarModal} animationType="fade" transparent>
//         <View
//           style={{
//             flex: 1,
//             backgroundColor: 'rgba(0,0,0,0.4)',
//             justifyContent: 'center',
//             alignItems: 'center',
//             padding: tokens.spacing.sm,
//           }}>
//           <Animatable.View
//             animation="fadeInUp"
//             duration={250}
//             style={{
//               width: '100%',
//               maxWidth: 700,
//               height: '90%',
//               borderRadius: tokens.borderRadius['2xl'],
//               overflow: 'hidden',
//               backgroundColor: theme.colors.surface,
//               padding: tokens.spacing.md,
//             }}>
//             {/* ✅ Close Button Zone (always on top) */}
//             <View
//               pointerEvents="box-none"
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 right: 0,
//                 left: 0,
//                 height: 80,
//                 zIndex: 9999,
//                 elevation: 9999,
//                 alignItems: 'flex-end',
//                 justifyContent: 'flex-start',
//                 paddingTop: 16,
//                 paddingRight: 16,
//               }}>
//               <TouchableOpacity
//                 activeOpacity={0.7}
//                 onPress={() => {
//                   console.log('[❌ Similar Modal Close tapped]');
//                   ReactNativeHapticFeedback.trigger('impactLight');
//                   closeAllModals();
//                 }}
//                 hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
//                 style={{
//                   backgroundColor: 'rgba(0,0,0,0.6)',
//                   borderRadius: 30,
//                   padding: 8,
//                 }}>
//                 <MaterialIcons name="close" size={28} color="white" />
//               </TouchableOpacity>
//             </View>

//             {/* 🔄 Content */}
//             {loading ? (
//               <View
//                 style={{
//                   flex: 1,
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                 }}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: tokens.spacing.md,
//                   }}>
//                   Finding similar looks...
//                 </Text>
//               </View>
//             ) : (
//               <ScrollView showsVerticalScrollIndicator={false}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 20,
//                     marginBottom: 30,
//                   }}>
//                   Similar Looks
//                 </Text>

//                 {/* 🧠 Empty */}
//                 {data.length === 0 && (
//                   <View
//                     style={{
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                       paddingVertical: 40,
//                     }}>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         opacity: 0.7,
//                       }}>
//                       No similar looks found.
//                     </Text>
//                   </View>
//                 )}

//                 {/* 🖼️ Grid */}
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                   }}>
//                   {data.map((look, idx) => (
//                     <TouchableOpacity
//                       key={idx}
//                       activeOpacity={0.85}
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactLight');
//                         setShowSimilarModal(false);
//                         setTimeout(() => {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           openShopModal(look.link);
//                         }, 300);
//                       }}
//                       style={{
//                         width: '48%',
//                         marginBottom: tokens.spacing.md,
//                       }}>
//                       <Image
//                         source={{
//                           uri: look.image?.startsWith('http')
//                             ? look.image
//                             : 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//                         }}
//                         style={{
//                           width: '100%',
//                           height: 180,
//                           borderRadius: 12,
//                           backgroundColor: theme.colors.surface2,
//                         }}
//                         resizeMode="cover"
//                       />
//                       <Text
//                         numberOfLines={2}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 12,
//                           marginTop: 6,
//                           textAlign: 'center',
//                         }}>
//                         {look.title || 'Similar look'}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </ScrollView>
//             )}
//           </Animatable.View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }
