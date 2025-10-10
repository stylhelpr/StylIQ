/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {WebView} from 'react-native-webview';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import FrostedCard from '../components/FrostedCard/FrostedCard';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useSimilarLooks} from '../hooks/useSimilarLooks';

const {width} = Dimensions.get('window');
const CARD_SIZE = width / 2 - tokens.spacing.md * 1.5;

type WardrobeItem = {
  id: string;
  name: string;
  image?: string;
  color?: string;
  brand?: string;
  shopUrl?: string;
};

type Props = {
  route: {
    params: {
      data: {
        owned?: WardrobeItem[];
        recommendations?: WardrobeItem[];
      };
    };
  };
  navigation: any;
};

export default function RecreatedLookScreen({route, navigation}: Props) {
  const {theme} = useAppTheme();
  const {centeredSection} = useGlobalStyles();
  // const {owned = [], recommendations = []} = route.params?.data || {};
  const {outfit = [], recommendations = []} = route.params?.data || {};
  const owned = outfit.length ? outfit : route.params?.data?.owned || [];

  const [shopUrl, setShopUrl] = useState<string | null>(null);
  const {fetchSimilar, data, loading} = useSimilarLooks();
  const [showSimilarModal, setShowSimilarModal] = useState(false);

  const handleBack = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.goBack();
  };

  const openShopModal = (url?: string) => {
    if (!url) return;
    ReactNativeHapticFeedback.trigger('impactMedium');
    setShopUrl(url);
  };

  const closeShopModal = () => setShopUrl(null);

  const handleFindSimilar = async () => {
    const image =
      recommendations?.[0]?.image ||
      owned?.[0]?.image ||
      'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';

    ReactNativeHapticFeedback.trigger('impactMedium');
    await fetchSimilar(image);
    setShowSimilarModal(true);
  };

  const renderCard = (
    item: WardrobeItem,
    index: number,
    isRecommended = false,
  ) => (
    <Animatable.View
      key={item.id + index}
      animation="fadeInUp"
      delay={index * 80}
      duration={400}
      style={{
        marginBottom: tokens.spacing.lg,
        width: CARD_SIZE,
        height: CARD_SIZE * 1.35,
      }}>
      <FrostedCard style={{flex: 1, overflow: 'hidden'}}>
        <Image
          source={{
            uri:
              item.image ||
              'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
          }}
          style={{width: '100%', height: '100%'}}
          resizeMode="cover"
        />
      </FrostedCard>

      <View style={{marginTop: 6}}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.foreground,
            fontWeight: '600',
            fontSize: 14,
          }}>
          {item.name}
        </Text>
        {item.brand && (
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.foreground,
              fontSize: 12,
              opacity: 0.8,
              marginTop: 2,
            }}>
            {item.brand}
          </Text>
        )}
      </View>

      {/* 🛍️ Shop Similar CTA */}
      {isRecommended && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => openShopModal(item.shopUrl)}
          style={{
            marginTop: 8,
            backgroundColor: theme.colors.surface2,
            paddingVertical: 6,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
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
    </Animatable.View>
  );

  return (
    <View style={{flex: 1, backgroundColor: theme.colors.background}}>
      {/* Back Button */}
      <View
        style={{
          position: 'absolute',
          top: 60,
          left: 20,
          zIndex: 10,
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderRadius: 30,
        }}>
        <AppleTouchFeedback onPress={handleBack}>
          <View style={{padding: 8}}>
            <MaterialIcons name="chevron-left" color="white" size={30} />
          </View>
        </AppleTouchFeedback>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          centeredSection,
          {paddingTop: 100, paddingBottom: 120},
        ]}>
        {/* Header */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: theme.colors.foreground,
            marginBottom: tokens.spacing.sm,
            textAlign: 'center',
          }}>
          Recreated Look
        </Text>
        <Text
          style={{
            color: theme.colors.foreground,
            fontSize: 15,
            marginBottom: tokens.spacing.xl,
            textAlign: 'center',
            opacity: 0.8,
          }}>
          AI matched your wardrobe & found real shoppable pieces
        </Text>

        {/* Owned */}
        {owned.length > 0 && (
          <>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '600',
                color: theme.colors.foreground,
                marginBottom: tokens.spacing.md,
              }}>
              👕 Items You Own
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              }}>
              {owned.map((item, idx) => renderCard(item, idx))}
            </View>
          </>
        )}

        {/* Recommended */}
        {recommendations.length > 0 && (
          <>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '600',
                color: theme.colors.foreground,
                marginTop: tokens.spacing.xl,
                marginBottom: tokens.spacing.md,
              }}>
              🛍️ Recommended to Add
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              }}>
              {recommendations.map((item, idx) => renderCard(item, idx, true))}
            </View>
          </>
        )}

        {/* Empty State */}
        {owned.length === 0 && recommendations.length === 0 && (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 60,
            }}>
            <Text
              style={{
                color: theme.colors.foreground,
                fontSize: 16,
                textAlign: 'center',
              }}>
              No outfit data found. Try recreating another look.
            </Text>
          </View>
        )}

        {/* Done CTA */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleBack}
          style={{
            marginTop: tokens.spacing.xl,
            backgroundColor: theme.colors.primary,
            paddingVertical: 16,
            borderRadius: tokens.borderRadius.xl,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 8,
            shadowOffset: {width: 0, height: 3},
          }}>
          <Text
            style={{
              color: 'white',
              fontWeight: '600',
              fontSize: 16,
            }}>
            Done
          </Text>
        </TouchableOpacity>

        {/* Find Similar Looks */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleFindSimilar}
          style={{
            marginTop: tokens.spacing.md,
            backgroundColor: 'red',
            paddingVertical: 14,
            borderRadius: tokens.borderRadius.xl,
            alignItems: 'center',
          }}>
          <Text style={{color: 'blue', fontWeight: '600'}}>
            Find Similar Looks →
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 🌐 SHOP MODAL */}
      <Modal visible={!!shopUrl} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: tokens.spacing.lg,
          }}>
          <Animatable.View
            animation="fadeInUp"
            duration={250}
            style={{
              width: '100%',
              maxWidth: 700,
              height: '80%',
              borderRadius: tokens.borderRadius['2xl'],
              overflow: 'hidden',
              backgroundColor: theme.colors.surface,
            }}>
            {shopUrl && (
              <WebView
                source={{uri: shopUrl}}
                startInLoadingState
                style={{flex: 1, backgroundColor: theme.colors.surface}}
              />
            )}

            {/* Close button */}
            <AppleTouchFeedback onPress={closeShopModal}>
              <View
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: 30,
                  padding: 6,
                }}>
                <MaterialIcons name="close" size={26} color="white" />
              </View>
            </AppleTouchFeedback>
          </Animatable.View>
        </View>
      </Modal>

      {/* Similar Looks Modal */}
      <Modal visible={showSimilarModal} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: tokens.spacing.lg,
          }}>
          <Animatable.View
            animation="fadeInUp"
            duration={250}
            style={{
              width: '100%',
              maxWidth: 700,
              height: '80%',
              borderRadius: tokens.borderRadius['2xl'],
              overflow: 'hidden',
              backgroundColor: theme.colors.surface,
              padding: tokens.spacing.md,
            }}>
            {loading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text
                  style={{
                    color: theme.colors.foreground,
                    marginTop: tokens.spacing.md,
                  }}>
                  Finding similar looks...
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text
                  style={{
                    color: theme.colors.foreground,
                    fontWeight: '700',
                    fontSize: 20,
                    marginBottom: tokens.spacing.md,
                  }}>
                  Similar Looks
                </Text>

                {/* 🧠 No Results Fallback */}
                {data.length === 0 && (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 40,
                    }}>
                    <Text
                      style={{
                        color: theme.colors.foreground,
                        opacity: 0.7,
                      }}>
                      No similar looks found.
                    </Text>
                  </View>
                )}

                {/* 🖼️ Results Grid */}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                  }}>
                  {data.map((look, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setShopUrl(look.link)}
                      activeOpacity={0.85}
                      style={{
                        width: '48%',
                        marginBottom: tokens.spacing.md,
                      }}>
                      <Image
                        source={{
                          uri: look.image?.startsWith('http')
                            ? look.image
                            : 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
                        }}
                        style={{
                          width: '100%',
                          height: 180,
                          borderRadius: 12,
                          backgroundColor: theme.colors.surface2,
                        }}
                        resizeMode="cover"
                      />
                      {/* 🏷️ Caption */}
                      <Text
                        numberOfLines={2}
                        style={{
                          color: theme.colors.foreground,
                          fontSize: 12,
                          marginTop: 6,
                          textAlign: 'center',
                        }}>
                        {look.title || 'Similar look'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Close button */}
            <AppleTouchFeedback onPress={() => setShowSimilarModal(false)}>
              <View
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: 30,
                  padding: 6,
                }}>
                <MaterialIcons name="close" size={26} color="white" />
              </View>
            </AppleTouchFeedback>
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
}

/////////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
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
//       };
//     };
//   };
//   navigation: any;
// };

// export default function RecreatedLookScreen({route, navigation}: Props) {
//   const {theme} = useAppTheme();
//   const {centeredSection} = useGlobalStyles();
//   const {owned = [], recommendations = []} = route.params?.data || {};
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   const handleBack = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     navigation.goBack();
//   };

//   const openShopModal = (url?: string) => {
//     if (!url) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     setShopUrl(url);
//   };

//   const closeShopModal = () => setShopUrl(null);

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
//     <View style={{flex: 1, backgroundColor: theme.colors.background}}>
//       {/* Back Button */}
//       <View
//         style={{
//           position: 'absolute',
//           top: 60,
//           left: 20,
//           zIndex: 10,
//           backgroundColor: 'rgba(0,0,0,0.4)',
//           borderRadius: 30,
//         }}>
//         <AppleTouchFeedback onPress={handleBack}>
//           <View style={{padding: 8}}>
//             <MaterialIcons name="chevron-left" color="white" size={30} />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={[
//           centeredSection,
//           {paddingTop: 100, paddingBottom: 120},
//         ]}>
//         {/* Header */}
//         <Text
//           style={{
//             fontSize: 28,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             marginBottom: tokens.spacing.sm,
//             textAlign: 'center',
//           }}>
//           Recreated Look
//         </Text>
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             fontSize: 15,
//             marginBottom: tokens.spacing.xl,
//             textAlign: 'center',
//             opacity: 0.8,
//           }}>
//           AI matched your wardrobe & found real shoppable pieces
//         </Text>

//         {/* Owned */}
//         {owned.length > 0 && (
//           <>
//             <Text
//               style={{
//                 fontSize: 20,
//                 fontWeight: '600',
//                 color: theme.colors.foreground,
//                 marginBottom: tokens.spacing.md,
//               }}>
//               👕 Items You Own
//             </Text>
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

//         {/* Recommended */}
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

//         {/* Empty State */}
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

//         {/* Done CTA */}
//         <TouchableOpacity
//           activeOpacity={0.9}
//           onPress={handleBack}
//           style={{
//             marginTop: tokens.spacing.xl,
//             backgroundColor: theme.colors.primary,
//             paddingVertical: 16,
//             borderRadius: tokens.borderRadius.xl,
//             alignItems: 'center',
//             shadowColor: '#000',
//             shadowOpacity: 0.15,
//             shadowRadius: 8,
//             shadowOffset: {width: 0, height: 3},
//           }}>
//           <Text
//             style={{
//               color: 'white',
//               fontWeight: '600',
//               fontSize: 16,
//             }}>
//             Done
//           </Text>
//         </TouchableOpacity>
//       </ScrollView>

//       {/* 🌐 SHOP MODAL */}
//       <Modal visible={!!shopUrl} animationType="fade" transparent>
//         <View
//           style={{
//             flex: 1,
//             backgroundColor: 'rgba(0,0,0,0.4)',
//             justifyContent: 'center',
//             alignItems: 'center',
//             padding: tokens.spacing.lg,
//           }}>
//           <Animatable.View
//             animation="fadeInUp"
//             duration={250}
//             style={{
//               width: '100%',
//               maxWidth: 700,
//               height: '80%',
//               borderRadius: tokens.borderRadius['2xl'],
//               overflow: 'hidden',
//               backgroundColor: theme.colors.surface,
//             }}>
//             {shopUrl && (
//               <WebView
//                 source={{uri: shopUrl}}
//                 startInLoadingState
//                 style={{flex: 1, backgroundColor: theme.colors.surface}}
//               />
//             )}

//             {/* Close button */}
//             <AppleTouchFeedback onPress={closeShopModal}>
//               <View
//                 style={{
//                   position: 'absolute',
//                   top: 16,
//                   right: 16,
//                   backgroundColor: 'rgba(0,0,0,0.6)',
//                   borderRadius: 30,
//                   padding: 6,
//                 }}>
//                 <MaterialIcons name="close" size={26} color="white" />
//               </View>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
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
//       };
//     };
//   };
//   navigation: any;
// };

// export default function RecreatedLookScreen({route, navigation}: Props) {
//   const {theme} = useAppTheme();
//   const {centeredSection} = useGlobalStyles();
//   const {owned = [], recommendations = []} = route.params?.data || {};
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   const handleBack = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     navigation.goBack();
//   };

//   const openShopModal = (url?: string) => {
//     if (!url) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     setShopUrl(url);
//   };

//   const closeShopModal = () => setShopUrl(null);

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
//             backgroundColor: theme.colors.surface,
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
//     <View style={{flex: 1, backgroundColor: theme.colors.background}}>
//       {/* Back Button */}
//       <View
//         style={{
//           position: 'absolute',
//           top: 60,
//           left: 20,
//           zIndex: 10,
//           backgroundColor: 'rgba(0,0,0,0.4)',
//           borderRadius: 30,
//         }}>
//         <AppleTouchFeedback onPress={handleBack}>
//           <View style={{padding: 8}}>
//             <MaterialIcons name="chevron-left" color="white" size={30} />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={[
//           centeredSection,
//           {paddingTop: 100, paddingBottom: 120},
//         ]}>
//         <Text
//           style={{
//             fontSize: 28,
//             fontWeight: '700',
//             color: 'red',
//             marginBottom: tokens.spacing.sm,
//             textAlign: 'center',
//           }}>
//           Recreated Look
//         </Text>
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             fontSize: 15,
//             marginBottom: tokens.spacing.xl,
//             textAlign: 'center',
//           }}>
//           AI matched your wardrobe & suggested similar shop options
//         </Text>

//         {/* Owned */}
//         {owned.length > 0 && (
//           <>
//             <Text
//               style={{
//                 fontSize: 20,
//                 fontWeight: '600',
//                 color: theme.colors.foreground,
//                 marginBottom: tokens.spacing.md,
//               }}>
//               👕 Items You Own
//             </Text>
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

//         {/* Recommended */}
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

//         {/* Empty State */}
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

//         {/* Done CTA */}
//         <TouchableOpacity
//           activeOpacity={0.9}
//           onPress={handleBack}
//           style={{
//             marginTop: tokens.spacing.xl,
//             backgroundColor: 'blue',
//             paddingVertical: 16,
//             borderRadius: tokens.borderRadius.xl,
//             alignItems: 'center',
//           }}>
//           <Text
//             style={{
//               color: 'red',
//               fontWeight: '600',
//               fontSize: 16,
//             }}>
//             Done
//           </Text>
//         </TouchableOpacity>
//       </ScrollView>

//       {/* 🌐 SHOP MODAL */}
//       <Modal visible={!!shopUrl} animationType="fade" transparent>
//         <View
//           style={{
//             flex: 1,
//             backgroundColor: theme.colors.background,
//             justifyContent: 'center',
//             alignItems: 'center',
//             padding: tokens.spacing.lg,
//           }}>
//           <Animatable.View
//             animation="fadeInUp"
//             duration={250}
//             style={{
//               width: '100%',
//               maxWidth: 700,
//               height: '80%',
//               borderRadius: tokens.borderRadius['2xl'],
//               overflow: 'hidden',
//               backgroundColor: theme.colors.surface,
//             }}>
//             {shopUrl && (
//               <WebView
//                 source={{uri: shopUrl}}
//                 startInLoadingState
//                 style={{flex: 1, backgroundColor: theme.colors.surface}}
//               />
//             )}

//             {/* Close button */}
//             <AppleTouchFeedback onPress={closeShopModal}>
//               <View
//                 style={{
//                   position: 'absolute',
//                   top: 16,
//                   right: 16,
//                   backgroundColor: theme.colors.background,
//                   borderRadius: 30,
//                   padding: 6,
//                 }}>
//                 <MaterialIcons name="close" size={26} color="white" />
//               </View>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   ScrollView,
//   Dimensions,
//   TouchableOpacity,
//   Modal,
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
//       };
//     };
//   };
//   navigation: any;
// };

// export default function RecreatedLookScreen({route, navigation}: Props) {
//   const {theme} = useAppTheme();
//   const {centeredSection} = useGlobalStyles();
//   const {owned = [], recommendations = []} = route.params?.data || {};
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   const handleBack = () => {
//     ReactNativeHapticFeedback.trigger('impactLight');
//     navigation.goBack();
//   };

//   const openShopModal = (url?: string) => {
//     if (!url) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     setShopUrl(url);
//   };

//   const closeShopModal = () => setShopUrl(null);

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
//             backgroundColor: theme.colors.surface,
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
//     <View style={{flex: 1, backgroundColor: theme.colors.background}}>
//       {/* Back Button */}
//       <View
//         style={{
//           position: 'absolute',
//           top: 60,
//           left: 20,
//           zIndex: 10,
//           backgroundColor: 'rgba(0,0,0,0.4)',
//           borderRadius: 30,
//         }}>
//         <AppleTouchFeedback onPress={handleBack}>
//           <View style={{padding: 8}}>
//             <MaterialIcons name="chevron-left" color="white" size={30} />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={[
//           centeredSection,
//           {paddingTop: 100, paddingBottom: 120},
//         ]}>
//         <Text
//           style={{
//             fontSize: 28,
//             fontWeight: '700',
//             color: 'red',
//             marginBottom: tokens.spacing.sm,
//             textAlign: 'center',
//           }}>
//           Recreated Look
//         </Text>
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             fontSize: 15,
//             marginBottom: tokens.spacing.xl,
//             textAlign: 'center',
//           }}>
//           AI matched your wardrobe & suggested similar shop options
//         </Text>

//         {/* Owned */}
//         {owned.length > 0 && (
//           <>
//             <Text
//               style={{
//                 fontSize: 20,
//                 fontWeight: '600',
//                 color: theme.colors.foreground,
//                 marginBottom: tokens.spacing.md,
//               }}>
//               👕 Items You Own
//             </Text>
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

//         {/* Recommended */}
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

//         {/* Empty State */}
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

//         {/* Done CTA */}
//         <TouchableOpacity
//           activeOpacity={0.9}
//           onPress={handleBack}
//           style={{
//             marginTop: tokens.spacing.xl,
//             backgroundColor: 'blue',
//             paddingVertical: 16,
//             borderRadius: tokens.borderRadius.xl,
//             alignItems: 'center',
//           }}>
//           <Text
//             style={{
//               color: 'red',
//               fontWeight: '600',
//               fontSize: 16,
//             }}>
//             Done
//           </Text>
//         </TouchableOpacity>
//       </ScrollView>

//       {/* 🌐 SHOP MODAL */}
//       <Modal visible={!!shopUrl} animationType="fade" transparent>
//         <View
//           style={{
//             flex: 1,
//             backgroundColor: theme.colors.background,
//             justifyContent: 'center',
//             alignItems: 'center',
//             padding: tokens.spacing.lg,
//           }}>
//           <Animatable.View
//             animation="fadeInUp"
//             duration={250}
//             style={{
//               width: '100%',
//               maxWidth: 700,
//               height: '80%',
//               borderRadius: tokens.borderRadius['2xl'],
//               overflow: 'hidden',
//               backgroundColor: theme.colors.surface,
//             }}>
//             {shopUrl && (
//               <WebView
//                 source={{uri: shopUrl}}
//                 startInLoadingState
//                 style={{flex: 1, backgroundColor: theme.colors.surface}}
//               />
//             )}

//             {/* Close button */}
//             <AppleTouchFeedback onPress={closeShopModal}>
//               <View
//                 style={{
//                   position: 'absolute',
//                   top: 16,
//                   right: 16,
//                   backgroundColor: theme.colors.background,
//                   borderRadius: 30,
//                   padding: 6,
//                 }}>
//                 <MaterialIcons name="close" size={26} color="white" />
//               </View>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         </View>
//       </Modal>
//     </View>
//   );
// }
