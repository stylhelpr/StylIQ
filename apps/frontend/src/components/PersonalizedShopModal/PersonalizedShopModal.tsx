/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import IntegratedShopOverlay from '../../components/ShopModal/IntegratedShopOverlay';
import type {PersonalizedResult} from '../../hooks/useRecreateLook';

export default function PersonalizedShopModal({
  visible,
  onClose,
  purchases,
  styleNote,
}: {
  visible: boolean;
  onClose: () => void;
} & Partial<PersonalizedResult>) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const [shopUrl, setShopUrl] = useState<string | null>(null);

  useEffect(() => {
    if (visible) ReactNativeHapticFeedback.trigger('impactLight');
  }, [visible]);

  if (!visible) return null;

  // 🧩 Normalize props safely: include both recreated_outfit + suggested_purchases
  const purchaseList = Array.isArray(purchases)
    ? purchases
    : (purchases as PersonalizedResult)?.suggested_purchases || [];

  const recreated = (purchases as PersonalizedResult)?.recreated_outfit || [];

  // 🪄 Merge wardrobe + purchases into one visual list
  const fullOutfit = [...recreated, ...purchaseList];
  const hasNoData = !fullOutfit || fullOutfit.length === 0;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: tokens.spacing.sm,
        }}>
        <Animatable.View
          animation="fadeInUp"
          duration={300}
          style={{
            width: '100%',
            maxWidth: 700,
            height: '90%',
            backgroundColor: theme.colors.surface,
            borderRadius: tokens.borderRadius['2xl'],
            overflow: 'hidden',
            padding: tokens.spacing.md,
          }}>
          {/* ✖️ Close */}
          <TouchableOpacity
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              onClose();
            }}
            style={{
              position: 'absolute',
              top: 5,
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

          {/* 🧾 Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 80}}>
            <Text
              numberOfLines={1}
              style={[globalStyles.sectionTitle, {marginTop: 40}]}>
              Full Outfit
            </Text>

            {/* 🌀 Loading State */}
            {hasNoData ? (
              <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text
                  style={{
                    color: theme.colors.foreground,
                    marginTop: 12,
                    opacity: 0.7,
                    fontSize: 14,
                  }}>
                  Generating your personalized outfit...
                </Text>
              </View>
            ) : (
              <>
                {/* 🧥 Full Outfit (Wardrobe + Purchases) */}
                <View style={{marginTop: 20}}>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      paddingBottom: 20,
                    }}>
                    {fullOutfit.map((p, i) => {
                      // 🧩 Enhanced image resolution logic
                      const imgUri =
                        p.previewImage &&
                        !p.previewImage.includes('No_image_available')
                          ? p.previewImage
                          : p.image ||
                            p.image_url ||
                            `https://storage.googleapis.com/stylhelpr-prod-bucket/${encodeURIComponent(
                              (p.item || p.name || 'default')
                                .toLowerCase()
                                .replace(/\s+/g, '_'),
                            )}.jpg`;

                      console.log('🖼️ Displaying', p.item, '→', imgUri);

                      return (
                        <Animatable.View
                          key={i}
                          animation="fadeInUp"
                          duration={400}
                          delay={i * 100}
                          style={{
                            width: '48%',
                            marginBottom: tokens.spacing.lg,
                            backgroundColor: theme.colors.surface2,
                            borderRadius: tokens.borderRadius.lg,
                            overflow: 'hidden',
                            shadowColor: '#000',
                            shadowOpacity: 0.1,
                            shadowRadius: 6,
                            elevation: 2,
                          }}>
                          <TouchableOpacity
                            onPress={() => {
                              if (p.shopUrl || p.previewUrl) {
                                ReactNativeHapticFeedback.trigger(
                                  'impactMedium',
                                );
                                setShopUrl(p.shopUrl || p.previewUrl);
                              }
                            }}
                            activeOpacity={0.9}>
                            <Image
                              source={{uri: imgUri}}
                              style={{
                                width: '100%',
                                height: 220,
                                borderTopLeftRadius: tokens.borderRadius.lg,
                                borderTopRightRadius: tokens.borderRadius.lg,
                                opacity: p.source === 'wardrobe' ? 0.85 : 1,
                              }}
                              resizeMode="cover"
                            />
                            {p.brand && (
                              <View
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  backgroundColor: 'rgba(0,0,0,0.45)',
                                  paddingVertical: 4,
                                }}>
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: 12,
                                    textAlign: 'center',
                                  }}>
                                  {p.brand}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>

                          <View style={{padding: 12}}>
                            <Text
                              numberOfLines={1}
                              style={{
                                color: theme.colors.foreground,
                                fontWeight: '600',
                                fontSize: 14,
                              }}>
                              {p.item || p.name}
                            </Text>
                            <Text
                              style={{
                                color: theme.colors.foreground,
                                opacity: 0.7,
                                fontSize: 12,
                                marginTop: 2,
                              }}>
                              {p.category} • {p.color}
                            </Text>
                            {p.previewPrice ? (
                              <Text
                                style={{
                                  color: theme.colors.primary,
                                  fontWeight: '600',
                                  fontSize: 13,
                                  marginTop: 6,
                                }}>
                                {p.previewPrice}
                              </Text>
                            ) : null}
                          </View>
                        </Animatable.View>
                      );
                    })}
                  </View>

                  {styleNote ? (
                    <Text
                      style={{
                        color: theme.colors.foreground,
                        marginTop: 10,
                        fontSize: 13,
                        lineHeight: 18,
                      }}>
                      {styleNote}
                    </Text>
                  ) : null}
                </View>
              </>
            )}
          </ScrollView>
        </Animatable.View>

        {/* 🌐 In-App WebView Overlay */}
        <IntegratedShopOverlay
          visible={!!shopUrl}
          onClose={() => setShopUrl(null)}
          url={shopUrl}
        />
      </View>
    </Modal>
  );
}

///////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import IntegratedShopOverlay from '../../components/ShopModal/IntegratedShopOverlay';
// import type {PersonalizedResult} from '../../hooks/useRecreateLook';

// export default function PersonalizedShopModal({
//   visible,
//   onClose,
//   purchases,
//   styleNote,
// }: {
//   visible: boolean;
//   onClose: () => void;
// } & Partial<PersonalizedResult>) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   useEffect(() => {
//     if (visible) ReactNativeHapticFeedback.trigger('impactLight');
//   }, [visible]);

//   if (!visible) return null;

//   // 🧩 Normalize props safely: include both recreated_outfit + suggested_purchases
//   const purchaseList = Array.isArray(purchases)
//     ? purchases
//     : (purchases as PersonalizedResult)?.suggested_purchases || [];

//   const recreated = (purchases as PersonalizedResult)?.recreated_outfit || [];

//   // 🪄 Merge wardrobe + purchases into one visual list
//   const fullOutfit = [...recreated, ...purchaseList];

//   const hasNoData = !fullOutfit || fullOutfit.length === 0;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
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
//             padding: tokens.spacing.md,
//           }}>
//           {/* ✖️ Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 5,
//               right: 20,
//               zIndex: 999,
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

//           {/* 🧾 Content */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{paddingBottom: 80}}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 40}]}>
//               Full Outfit
//             </Text>

//             {/* 🌀 Loading State */}
//             {hasNoData ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                     fontSize: 14,
//                   }}>
//                   Generating your personalized outfit...
//                 </Text>
//               </View>
//             ) : (
//               <>
//                 {/* 🧥 Full Outfit (Wardrobe + Purchases) */}
//                 <View style={{marginTop: 20}}>
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       justifyContent: 'space-between',
//                       paddingBottom: 20,
//                     }}>
//                     {fullOutfit.map((p, i) => {
//                       // 🧩 Graceful image resolution
//                       const imgUri =
//                         p.previewImage ||
//                         p.image ||
//                         p.image_url ||
//                         (p.source === 'wardrobe' && p.name
//                           ? `https://storage.googleapis.com/stylhelpr-prod-bucket/${p.name
//                               ?.toLowerCase()
//                               .replace(/\s+/g, '_')}.jpg`
//                           : 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg');

//                       return (
//                         <Animatable.View
//                           key={i}
//                           animation="fadeInUp"
//                           duration={400}
//                           delay={i * 100}
//                           style={{
//                             width: '48%',
//                             marginBottom: tokens.spacing.lg,
//                             backgroundColor: theme.colors.surface2,
//                             borderRadius: tokens.borderRadius.lg,
//                             overflow: 'hidden',
//                             shadowColor: '#000',
//                             shadowOpacity: 0.1,
//                             shadowRadius: 6,
//                             elevation: 2,
//                           }}>
//                           <TouchableOpacity
//                             onPress={() => {
//                               if (p.shopUrl || p.previewUrl) {
//                                 ReactNativeHapticFeedback.trigger(
//                                   'impactMedium',
//                                 );
//                                 setShopUrl(p.shopUrl || p.previewUrl);
//                               }
//                             }}
//                             activeOpacity={0.9}>
//                             <Image
//                               source={{uri: imgUri}}
//                               style={{
//                                 width: '100%',
//                                 height: 220,
//                                 borderTopLeftRadius: tokens.borderRadius.lg,
//                                 borderTopRightRadius: tokens.borderRadius.lg,
//                                 opacity: p.source === 'wardrobe' ? 0.85 : 1,
//                               }}
//                               resizeMode="cover"
//                             />
//                             {p.brand && (
//                               <View
//                                 style={{
//                                   position: 'absolute',
//                                   bottom: 0,
//                                   left: 0,
//                                   right: 0,
//                                   backgroundColor: 'rgba(0,0,0,0.45)',
//                                   paddingVertical: 4,
//                                 }}>
//                                 <Text
//                                   numberOfLines={1}
//                                   style={{
//                                     color: 'white',
//                                     fontWeight: '600',
//                                     fontSize: 12,
//                                     textAlign: 'center',
//                                   }}>
//                                   {p.brand}
//                                 </Text>
//                               </View>
//                             )}
//                           </TouchableOpacity>

//                           <View style={{padding: 12}}>
//                             <Text
//                               numberOfLines={1}
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 14,
//                               }}>
//                               {p.item || p.name}
//                             </Text>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 opacity: 0.7,
//                                 fontSize: 12,
//                                 marginTop: 2,
//                               }}>
//                               {p.category} • {p.color}
//                             </Text>
//                             {p.previewPrice ? (
//                               <Text
//                                 style={{
//                                   color: theme.colors.primary,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                   marginTop: 6,
//                                 }}>
//                                 {p.previewPrice}
//                               </Text>
//                             ) : null}
//                           </View>
//                         </Animatable.View>
//                       );
//                     })}
//                   </View>

//                   {styleNote ? (
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         marginTop: 10,
//                         fontSize: 13,
//                         lineHeight: 18,
//                       }}>
//                       {styleNote}
//                     </Text>
//                   ) : null}
//                 </View>
//               </>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* 🌐 In-App WebView Overlay */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import IntegratedShopOverlay from '../../components/ShopModal/IntegratedShopOverlay';
// import type {PersonalizedResult} from '../../hooks/useRecreateLook';

// export default function PersonalizedShopModal({
//   visible,
//   onClose,
//   purchases,
//   styleNote,
// }: {
//   visible: boolean;
//   onClose: () => void;
// } & Partial<PersonalizedResult>) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   useEffect(() => {
//     if (visible) ReactNativeHapticFeedback.trigger('impactLight');
//   }, [visible]);

//   if (!visible) return null;

//   // 🧩 Normalize props safely (use only purchases for full outfit)
//   const purchaseList = Array.isArray(purchases)
//     ? purchases
//     : (purchases as PersonalizedResult)?.suggested_purchases || [];

//   const hasNoData = !purchaseList || purchaseList.length === 0;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
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
//             padding: tokens.spacing.md,
//           }}>
//           {/* ✖️ Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 5,
//               right: 20,
//               zIndex: 999,
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

//           {/* 🧾 Content */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{paddingBottom: 80}}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 40}]}>
//               Full Outfit
//             </Text>

//             {/* 🌀 Loading State */}
//             {hasNoData ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                     fontSize: 14,
//                   }}>
//                   Generating your personalized outfit...
//                 </Text>
//               </View>
//             ) : (
//               <>
//                 {/* 🧥 Full Purchasable Outfit */}
//                 <View style={{marginTop: 20}}>
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       justifyContent: 'space-between',
//                       paddingBottom: 20,
//                     }}>
//                     {purchaseList.map((p, i) => (
//                       <Animatable.View
//                         key={i}
//                         animation="fadeInUp"
//                         duration={400}
//                         delay={i * 100}
//                         style={{
//                           width: '48%',
//                           marginBottom: tokens.spacing.lg,
//                           backgroundColor: theme.colors.surface2,
//                           borderRadius: tokens.borderRadius.lg,
//                           overflow: 'hidden',
//                           shadowColor: '#000',
//                           shadowOpacity: 0.1,
//                           shadowRadius: 6,
//                           elevation: 2,
//                         }}>
//                         <TouchableOpacity
//                           onPress={() => {
//                             ReactNativeHapticFeedback.trigger('impactMedium');
//                             setShopUrl(p.shopUrl || p.previewUrl);
//                           }}
//                           activeOpacity={0.9}>
//                           <Image
//                             source={{
//                               uri:
//                                 p.previewImage ||
//                                 p.image ||
//                                 p.image_url ||
//                                 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//                             }}
//                             style={{
//                               width: '100%',
//                               height: 220,
//                               borderTopLeftRadius: tokens.borderRadius.lg,
//                               borderTopRightRadius: tokens.borderRadius.lg,
//                             }}
//                             resizeMode="cover"
//                           />
//                           {p.brand && (
//                             <View
//                               style={{
//                                 position: 'absolute',
//                                 bottom: 0,
//                                 left: 0,
//                                 right: 0,
//                                 backgroundColor: 'rgba(0,0,0,0.45)',
//                                 paddingVertical: 4,
//                               }}>
//                               <Text
//                                 numberOfLines={1}
//                                 style={{
//                                   color: 'white',
//                                   fontWeight: '600',
//                                   fontSize: 12,
//                                   textAlign: 'center',
//                                 }}>
//                                 {p.brand}
//                               </Text>
//                             </View>
//                           )}
//                         </TouchableOpacity>

//                         <View style={{padding: 12}}>
//                           <Text
//                             numberOfLines={1}
//                             style={{
//                               color: theme.colors.foreground,
//                               fontWeight: '600',
//                               fontSize: 14,
//                             }}>
//                             {p.item}
//                           </Text>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               opacity: 0.7,
//                               fontSize: 12,
//                               marginTop: 2,
//                             }}>
//                             {p.category} • {p.color}
//                           </Text>
//                           <Text
//                             style={{
//                               color: theme.colors.primary,
//                               fontWeight: '600',
//                               fontSize: 13,
//                               marginTop: 6,
//                             }}>
//                             {p.previewPrice || 'See store for price'}
//                           </Text>
//                         </View>
//                       </Animatable.View>
//                     ))}
//                   </View>

//                   {styleNote ? (
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         marginTop: 10,
//                         fontSize: 13,
//                         lineHeight: 18,
//                       }}>
//                       {styleNote}
//                     </Text>
//                   ) : null}
//                 </View>
//               </>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* 🌐 In-App WebView Overlay */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import IntegratedShopOverlay from '../../components/ShopModal/IntegratedShopOverlay';
// import type {PersonalizedResult} from '../../hooks/useRecreateLook';

// export default function PersonalizedShopModal({
//   visible,
//   onClose,
//   purchases,
//   recreatedOutfit,
//   styleNote,
// }: {
//   visible: boolean;
//   onClose: () => void;
// } & Partial<PersonalizedResult>) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   useEffect(() => {
//     if (visible) ReactNativeHapticFeedback.trigger('impactLight');
//   }, [visible]);

//   if (!visible) return null;

//   // 🧩 Normalize props safely
//   const outfitList = Array.isArray(recreatedOutfit) ? recreatedOutfit : [];
//   const purchaseList = Array.isArray(purchases)
//     ? purchases
//     : (purchases as PersonalizedResult)?.suggested_purchases || [];

//   const hasNoData =
//     (!outfitList || outfitList.length === 0) &&
//     (!purchaseList || purchaseList.length === 0);

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
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
//             padding: tokens.spacing.md,
//           }}>
//           {/* ✖️ Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 5,
//               right: 20,
//               zIndex: 999,
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

//           {/* 🧾 Content */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{paddingBottom: 80}}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 40}]}>
//               Personalized Finds
//             </Text>

//             {/* 🌀 Loading State */}
//             {hasNoData ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                     fontSize: 14,
//                   }}>
//                   Generating your personalized matches...
//                 </Text>
//               </View>
//             ) : (
//               <>
//                 {/* 👕 Recreated Outfit Section */}
//                 {outfitList.length > 0 && (
//                   <View style={{marginTop: 20, marginBottom: 10}}>
//                     <Text
//                       style={[
//                         globalStyles.sectionTitle,
//                         {marginBottom: tokens.spacing.sm},
//                       ]}>
//                       Your Recreated Look
//                     </Text>

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         justifyContent: 'space-between',
//                         paddingBottom: 20,
//                       }}>
//                       {outfitList.map((piece, i) => (
//                         <Animatable.View
//                           key={i}
//                           animation="fadeInUp"
//                           duration={400}
//                           delay={i * 100}
//                           style={{
//                             width: '48%',
//                             marginBottom: tokens.spacing.lg,
//                             backgroundColor: theme.colors.surface2,
//                             borderRadius: tokens.borderRadius.lg,
//                             overflow: 'hidden',
//                             shadowColor: '#000',
//                             shadowOpacity: 0.1,
//                             shadowRadius: 6,
//                             elevation: 2,
//                             alignItems: 'center',
//                             justifyContent: 'center',
//                             paddingVertical: 20,
//                           }}>
//                           <MaterialIcons
//                             name={
//                               piece.category?.toLowerCase().includes('shoe')
//                                 ? 'directions-walk'
//                                 : piece.category
//                                     ?.toLowerCase()
//                                     .includes('bottom')
//                                 ? 'styler'
//                                 : 'checkroom'
//                             }
//                             size={34}
//                             color={theme.colors.primary}
//                             style={{marginBottom: 8}}
//                           />
//                           <Text
//                             numberOfLines={2}
//                             style={{
//                               color: theme.colors.foreground,
//                               fontWeight: '600',
//                               fontSize: 14,
//                               textAlign: 'center',
//                               marginBottom: 4,
//                             }}>
//                             {piece.item}
//                           </Text>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               opacity: 0.7,
//                               fontSize: 12,
//                               marginBottom: 2,
//                             }}>
//                             {piece.category} • {piece.color}
//                           </Text>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               opacity: 0.6,
//                               fontSize: 11,
//                             }}>
//                             From your wardrobe
//                           </Text>
//                         </Animatable.View>
//                       ))}
//                     </View>

//                     {styleNote ? (
//                       <Text
//                         style={{
//                           color: theme.colors.foreground,
//                           marginTop: 10,
//                           fontSize: 13,
//                           lineHeight: 18,
//                         }}>
//                         {styleNote}
//                       </Text>
//                     ) : null}
//                   </View>
//                 )}

//                 {/* 🛍️ Suggested Purchases Section */}
//                 {purchaseList.length > 0 && (
//                   <View style={{marginTop: 30}}>
//                     <Text
//                       style={[
//                         globalStyles.sectionTitle,
//                         {marginBottom: tokens.spacing.sm},
//                       ]}>
//                       Suggested Purchases
//                     </Text>

//                     {purchaseList.map((p, i) => (
//                       <Animatable.View
//                         key={i}
//                         animation="fadeInUp"
//                         duration={400}
//                         delay={i * 100}
//                         style={{
//                           marginBottom: tokens.spacing.lg,
//                           backgroundColor: theme.colors.surface2,
//                           borderRadius: tokens.borderRadius.lg,
//                           overflow: 'hidden',
//                           shadowColor: '#000',
//                           shadowOpacity: 0.1,
//                           shadowRadius: 6,
//                           elevation: 2,
//                         }}>
//                         <TouchableOpacity
//                           onPress={() => {
//                             ReactNativeHapticFeedback.trigger('impactMedium');
//                             setShopUrl(p.shopUrl || p.previewUrl);
//                           }}
//                           activeOpacity={0.9}>
//                           <Image
//                             source={{
//                               uri:
//                                 p.previewImage ||
//                                 p.image ||
//                                 p.image_url ||
//                                 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//                             }}
//                             style={{
//                               width: '100%',
//                               height: 220,
//                               borderTopLeftRadius: tokens.borderRadius.lg,
//                               borderTopRightRadius: tokens.borderRadius.lg,
//                             }}
//                             resizeMode="cover"
//                           />
//                           {p.brand && (
//                             <View
//                               style={{
//                                 position: 'absolute',
//                                 bottom: 0,
//                                 left: 0,
//                                 right: 0,
//                                 backgroundColor: 'rgba(0,0,0,0.45)',
//                                 paddingVertical: 4,
//                               }}>
//                               <Text
//                                 numberOfLines={1}
//                                 style={{
//                                   color: 'white',
//                                   fontWeight: '600',
//                                   fontSize: 12,
//                                   textAlign: 'center',
//                                 }}>
//                                 {p.brand}
//                               </Text>
//                             </View>
//                           )}
//                         </TouchableOpacity>

//                         <View style={{padding: 12}}>
//                           <Text
//                             numberOfLines={1}
//                             style={{
//                               color: theme.colors.foreground,
//                               fontWeight: '600',
//                               fontSize: 14,
//                             }}>
//                             {p.item}
//                           </Text>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               opacity: 0.7,
//                               fontSize: 12,
//                               marginTop: 2,
//                             }}>
//                             {p.category} • {p.color}
//                           </Text>
//                           <Text
//                             style={{
//                               color: theme.colors.primary,
//                               fontWeight: '600',
//                               fontSize: 13,
//                               marginTop: 6,
//                             }}>
//                             {p.previewPrice || 'See store for price'}
//                           </Text>
//                         </View>
//                       </Animatable.View>
//                     ))}
//                   </View>
//                 )}
//               </>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* 🌐 In-App WebView Overlay */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

////////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import IntegratedShopOverlay from '../../components/ShopModal/IntegratedShopOverlay';

// export default function PersonalizedShopModal({
//   visible,
//   onClose,
//   purchases,
//   recreatedOutfit,
//   styleNote,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   purchases: any[];
//   recreatedOutfit?: any[];
//   styleNote?: string;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   useEffect(() => {
//     if (visible) ReactNativeHapticFeedback.trigger('impactLight');
//   }, [visible]);

//   if (!visible) return null;

//   // 🧩 Normalize arrays defensively
//   const outfitList = Array.isArray(recreatedOutfit) ? recreatedOutfit : [];
//   const purchaseList = Array.isArray(purchases)
//     ? purchases
//     : purchases?.suggested_purchases || purchases?.purchases || [];

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
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
//             padding: tokens.spacing.md,
//           }}>
//           {/* ✖️ Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 5,
//               right: 20,
//               zIndex: 999,
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

//           {/* 🧾 Content */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{paddingBottom: 80}}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 40}]}>
//               Personalized Finds
//             </Text>

//             {!purchaseList?.length && !outfitList?.length ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                     fontSize: 14,
//                   }}>
//                   Generating your personalized matches...
//                 </Text>
//               </View>
//             ) : (
//               <>
//                 {/* 👕 Recreated Outfit Section */}
//                 {outfitList.length > 0 && (
//                   <View style={{marginTop: 20, marginBottom: 10}}>
//                     <Text
//                       style={[
//                         globalStyles.sectionTitle,
//                         {marginBottom: tokens.spacing.sm},
//                       ]}>
//                       Your Recreated Look
//                     </Text>

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         justifyContent: 'space-between',
//                         paddingBottom: 20,
//                       }}>
//                       {outfitList.map((piece: any, i: number) => (
//                         <Animatable.View
//                           key={i}
//                           animation="fadeInUp"
//                           duration={400}
//                           delay={i * 100}
//                           style={{
//                             width: '48%',
//                             marginBottom: tokens.spacing.lg,
//                             backgroundColor: theme.colors.surface2,
//                             borderRadius: tokens.borderRadius.lg,
//                             overflow: 'hidden',
//                             shadowColor: '#000',
//                             shadowOpacity: 0.1,
//                             shadowRadius: 6,
//                             elevation: 2,
//                             alignItems: 'center',
//                             justifyContent: 'center',
//                             paddingVertical: 16,
//                           }}>
//                           <MaterialIcons
//                             name="checkroom"
//                             size={36}
//                             color={theme.colors.primary}
//                             style={{marginBottom: 8}}
//                           />
//                           <Text
//                             numberOfLines={2}
//                             style={{
//                               color: theme.colors.foreground,
//                               fontWeight: '600',
//                               fontSize: 14,
//                               marginBottom: 4,
//                               textAlign: 'center',
//                             }}>
//                             {piece.item}
//                           </Text>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               opacity: 0.7,
//                               fontSize: 12,
//                               marginBottom: 4,
//                             }}>
//                             {piece.category} • {piece.color}
//                           </Text>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               opacity: 0.6,
//                               fontSize: 11,
//                             }}>
//                             From your wardrobe
//                           </Text>
//                         </Animatable.View>
//                       ))}
//                     </View>

//                     {styleNote ? (
//                       <Text
//                         style={{
//                           color: theme.colors.foreground,
//                           marginTop: 10,
//                           fontSize: 13,
//                           lineHeight: 18,
//                         }}>
//                         {styleNote}
//                       </Text>
//                     ) : null}
//                   </View>
//                 )}

//                 {/* 🛍️ Suggested Purchases */}
//                 {purchaseList.length > 0 && (
//                   <>
//                     <Text
//                       style={[
//                         globalStyles.sectionTitle,
//                         {marginTop: 20, marginBottom: tokens.spacing.sm},
//                       ]}>
//                       Suggested Purchases
//                     </Text>

//                     {purchaseList.map((p, i) => (
//                       <View key={i} style={{marginTop: 20}}>
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             fontSize: 16,
//                             fontWeight: '700',
//                             marginBottom: 4,
//                           }}>
//                           {p.item}
//                         </Text>
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             fontSize: 13,
//                             marginBottom: 8,
//                             opacity: 0.8,
//                           }}>
//                           {p.color || ''} {p.material ? `• ${p.material}` : ''}
//                         </Text>

//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             flexWrap: 'wrap',
//                             justifyContent: 'space-between',
//                             paddingBottom: 20,
//                           }}>
//                           {(p.products && p.products.length > 0
//                             ? p.products
//                             : [p]
//                           ).map((prod: any, j: number) => (
//                             <Animatable.View
//                               key={j}
//                               animation="fadeInUp"
//                               duration={400}
//                               delay={j * 100}
//                               style={{
//                                 width: '48%',
//                                 marginBottom: tokens.spacing.lg,
//                                 backgroundColor: theme.colors.surface2,
//                                 borderRadius: tokens.borderRadius.lg,
//                                 overflow: 'hidden',
//                                 shadowColor: '#000',
//                                 shadowOpacity: 0.1,
//                                 shadowRadius: 6,
//                                 elevation: 2,
//                               }}>
//                               <TouchableOpacity
//                                 onPress={() => {
//                                   ReactNativeHapticFeedback.trigger(
//                                     'impactMedium',
//                                   );
//                                   setShopUrl(
//                                     prod.shopUrl ||
//                                       prod.product_link ||
//                                       p.previewUrl,
//                                   );
//                                 }}
//                                 activeOpacity={0.9}>
//                                 <Image
//                                   source={{
//                                     uri:
//                                       prod.serpapi_thumbnail ||
//                                       prod.thumbnail ||
//                                       prod.image ||
//                                       prod.image_url ||
//                                       p.previewImage ||
//                                       'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//                                   }}
//                                   style={{
//                                     width: '100%',
//                                     height: 200,
//                                     borderTopLeftRadius: tokens.borderRadius.lg,
//                                     borderTopRightRadius:
//                                       tokens.borderRadius.lg,
//                                   }}
//                                   resizeMode="cover"
//                                 />

//                                 {(prod.brand ||
//                                   p.previewBrand ||
//                                   prod.source) && (
//                                   <View
//                                     style={{
//                                       position: 'absolute',
//                                       bottom: 0,
//                                       left: 0,
//                                       right: 0,
//                                       backgroundColor: 'rgba(0,0,0,0.45)',
//                                       paddingVertical: 4,
//                                     }}>
//                                     <Text
//                                       numberOfLines={1}
//                                       style={{
//                                         color: 'white',
//                                         fontWeight: '600',
//                                         fontSize: 12,
//                                         textAlign: 'center',
//                                       }}>
//                                       {prod.brand ||
//                                         p.previewBrand ||
//                                         prod.source}
//                                     </Text>
//                                   </View>
//                                 )}
//                               </TouchableOpacity>

//                               <View style={{padding: 10}}>
//                                 <Text
//                                   numberOfLines={1}
//                                   style={{
//                                     color: theme.colors.foreground,
//                                     fontWeight: '600',
//                                     fontSize: 13,
//                                   }}>
//                                   {prod.title || prod.name || p.item}
//                                 </Text>
//                                 {(prod.price || p.previewPrice) && (
//                                   <Text
//                                     style={{
//                                       color: theme.colors.primary,
//                                       fontWeight: '600',
//                                       fontSize: 13,
//                                       marginTop: 4,
//                                     }}>
//                                     {prod.price || p.previewPrice}
//                                   </Text>
//                                 )}
//                                 {(prod.source || p.previewBrand) && (
//                                   <Text
//                                     style={{
//                                       color: theme.colors.foreground,
//                                       opacity: 0.6,
//                                       fontSize: 10,
//                                       marginTop: 2,
//                                     }}>
//                                     Source: {prod.source || p.previewBrand}
//                                   </Text>
//                                 )}
//                               </View>
//                             </Animatable.View>
//                           ))}
//                         </View>
//                       </View>
//                     ))}
//                   </>
//                 )}
//               </>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* 🌐 Integrated overlay for in-app shop browsing */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

/////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import IntegratedShopOverlay from '../../components/ShopModal/IntegratedShopOverlay';

// export default function PersonalizedShopModal({
//   visible,
//   onClose,
//   purchases,
//   recreatedOutfit,
//   styleNote,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   purchases: any[];
//   recreatedOutfit?: any[];
//   styleNote?: string;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   useEffect(() => {
//     if (visible) ReactNativeHapticFeedback.trigger('impactLight');
//   }, [visible]);

//   if (!visible) return null;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
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
//             padding: tokens.spacing.md,
//           }}>
//           {/* ✖️ Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 5,
//               right: 20,
//               zIndex: 999,
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

//           {/* 🧾 Content */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{paddingBottom: 80}}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 40}]}>
//               Personalized Finds
//             </Text>

//             {!purchases?.length ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                     fontSize: 14,
//                   }}>
//                   Generating your personalized matches...
//                 </Text>
//               </View>
//             ) : (
//               <>
//                 {/* 👕 Recreated Outfit Section */}
//                 {recreatedOutfit?.length ? (
//                   <View style={{marginTop: 20, marginBottom: 10}}>
//                     <Text
//                       style={[
//                         globalStyles.sectionTitle,
//                         {marginBottom: tokens.spacing.sm},
//                       ]}>
//                       Your Recreated Look
//                     </Text>

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         justifyContent: 'space-between',
//                         paddingBottom: 20,
//                       }}>
//                       {recreatedOutfit.map((piece: any, i: number) => (
//                         <Animatable.View
//                           key={i}
//                           animation="fadeInUp"
//                           duration={400}
//                           delay={i * 100}
//                           style={{
//                             width: '48%',
//                             marginBottom: tokens.spacing.lg,
//                             backgroundColor: theme.colors.surface2,
//                             borderRadius: tokens.borderRadius.lg,
//                             overflow: 'hidden',
//                             shadowColor: '#000',
//                             shadowOpacity: 0.1,
//                             shadowRadius: 6,
//                             elevation: 2,
//                           }}>
//                           <View style={{padding: 12}}>
//                             <Text
//                               numberOfLines={2}
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 14,
//                                 marginBottom: 4,
//                               }}>
//                               {piece.item}
//                             </Text>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 opacity: 0.7,
//                                 fontSize: 12,
//                                 marginBottom: 4,
//                               }}>
//                               {piece.category} • {piece.color}
//                             </Text>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 opacity: 0.6,
//                                 fontSize: 11,
//                               }}>
//                               From your wardrobe
//                             </Text>
//                           </View>
//                         </Animatable.View>
//                       ))}
//                     </View>

//                     {styleNote ? (
//                       <Text
//                         style={{
//                           color: theme.colors.foreground,
//                           marginTop: 10,
//                           fontSize: 13,
//                           lineHeight: 18,
//                         }}>
//                         {styleNote}
//                       </Text>
//                     ) : null}
//                   </View>
//                 ) : null}

//                 {/* 🛍️ Product Groups */}
//                 {purchases.map((p, i) => (
//                   <View key={i} style={{marginTop: 25}}>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 16,
//                         fontWeight: '700',
//                         marginBottom: 4,
//                       }}>
//                       {p.item}
//                     </Text>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 13,
//                         marginBottom: 8,
//                         opacity: 0.8,
//                       }}>
//                       {p.color || ''} {p.material ? `• ${p.material}` : ''}
//                     </Text>

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         justifyContent: 'space-between',
//                         paddingBottom: 20,
//                       }}>
//                       {(p.products && p.products.length > 0
//                         ? p.products
//                         : [p]
//                       ).map((prod: any, j: number) => (
//                         <Animatable.View
//                           key={j}
//                           animation="fadeInUp"
//                           duration={400}
//                           delay={j * 100}
//                           style={{
//                             width: '48%',
//                             marginBottom: tokens.spacing.lg,
//                             backgroundColor: theme.colors.surface2,
//                             borderRadius: tokens.borderRadius.lg,
//                             overflow: 'hidden',
//                             shadowColor: '#000',
//                             shadowOpacity: 0.1,
//                             shadowRadius: 6,
//                             elevation: 2,
//                           }}>
//                           <TouchableOpacity
//                             onPress={() => {
//                               ReactNativeHapticFeedback.trigger('impactMedium');
//                               setShopUrl(
//                                 prod.shopUrl ||
//                                   prod.product_link ||
//                                   p.previewUrl,
//                               );
//                             }}
//                             activeOpacity={0.9}>
//                             <Image
//                               source={{
//                                 uri:
//                                   prod.serpapi_thumbnail || // 🏆 always prefer SerpAPI’s proxy URL
//                                   prod.thumbnail || // Fallback: Google’s cached image
//                                   prod.image ||
//                                   prod.image_url ||
//                                   p.previewImage ||
//                                   'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//                               }}
//                               style={{
//                                 width: '100%',
//                                 height: 200,
//                                 borderTopLeftRadius: tokens.borderRadius.lg,
//                                 borderTopRightRadius: tokens.borderRadius.lg,
//                               }}
//                               resizeMode="cover"
//                             />

//                             {(prod.brand || p.previewBrand || prod.source) && (
//                               <View
//                                 style={{
//                                   position: 'absolute',
//                                   bottom: 0,
//                                   left: 0,
//                                   right: 0,
//                                   backgroundColor: 'rgba(0,0,0,0.45)',
//                                   paddingVertical: 4,
//                                 }}>
//                                 <Text
//                                   numberOfLines={1}
//                                   style={{
//                                     color: 'white',
//                                     fontWeight: '600',
//                                     fontSize: 12,
//                                     textAlign: 'center',
//                                   }}>
//                                   {prod.brand || p.previewBrand || prod.source}
//                                 </Text>
//                               </View>
//                             )}
//                           </TouchableOpacity>

//                           <View style={{padding: 10}}>
//                             <Text
//                               numberOfLines={1}
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               {prod.title || prod.name || p.item}
//                             </Text>
//                             {(prod.price || p.previewPrice) && (
//                               <Text
//                                 style={{
//                                   color: theme.colors.primary,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                   marginTop: 4,
//                                 }}>
//                                 {prod.price || p.previewPrice}
//                               </Text>
//                             )}
//                             {(prod.source || p.previewBrand) && (
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   opacity: 0.6,
//                                   fontSize: 10,
//                                   marginTop: 2,
//                                 }}>
//                                 Source: {prod.source || p.previewBrand}
//                               </Text>
//                             )}
//                           </View>
//                         </Animatable.View>
//                       ))}
//                     </View>
//                   </View>
//                 ))}
//               </>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* 🌐 Integrated overlay for in-app shop browsing */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

///////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import IntegratedShopOverlay from '../../components/ShopModal/IntegratedShopOverlay';

// export default function PersonalizedShopModal({
//   visible,
//   onClose,
//   purchases,
//   recreatedOutfit,
//   styleNote,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   purchases: any[];
//   recreatedOutfit?: any[];
//   styleNote?: string;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   useEffect(() => {
//     if (visible) ReactNativeHapticFeedback.trigger('impactLight');
//   }, [visible]);

//   if (!visible) return null;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
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
//             padding: tokens.spacing.md,
//           }}>
//           {/* ✖️ Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 5,
//               right: 20,
//               zIndex: 999,
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

//           {/* 🧾 Content */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{paddingBottom: 80}}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 40}]}>
//               Personalized Finds
//             </Text>

//             {!purchases?.length ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                     fontSize: 14,
//                   }}>
//                   Generating your personalized matches...
//                 </Text>
//               </View>
//             ) : (
//               <>
//                 {/* 👕 Recreated Outfit Section */}
//                 {recreatedOutfit?.length ? (
//                   <View style={{marginTop: 20, marginBottom: 10}}>
//                     <Text
//                       style={[
//                         globalStyles.sectionTitle,
//                         {marginBottom: tokens.spacing.sm},
//                       ]}>
//                       Your Recreated Look
//                     </Text>
//                     {recreatedOutfit.map((piece: any, i: number) => (
//                       <Text
//                         key={i}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 14,
//                           marginBottom: 2,
//                         }}>
//                         • {piece.category}: {piece.item} — {piece.color}
//                       </Text>
//                     ))}
//                     {styleNote ? (
//                       <Text
//                         style={{
//                           color: theme.colors.foreground,
//                           marginTop: 10,
//                           fontSize: 13,
//                           lineHeight: 18,
//                         }}>
//                         {styleNote}
//                       </Text>
//                     ) : null}
//                   </View>
//                 ) : null}

//                 {/* 🛍️ Product Groups */}
//                 {purchases.map((p, i) => (
//                   <View key={i} style={{marginTop: 25}}>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 16,
//                         fontWeight: '700',
//                         marginBottom: 4,
//                       }}>
//                       {p.item}
//                     </Text>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 13,
//                         marginBottom: 8,
//                         opacity: 0.8,
//                       }}>
//                       {p.color || ''} {p.material ? `• ${p.material}` : ''}
//                     </Text>

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         justifyContent: 'space-between',
//                         paddingBottom: 20,
//                       }}>
//                       {(p.products && p.products.length > 0
//                         ? p.products
//                         : [p]
//                       ).map((prod: any, j: number) => (
//                         <Animatable.View
//                           key={j}
//                           animation="fadeInUp"
//                           duration={400}
//                           delay={j * 100}
//                           style={{
//                             width: '48%',
//                             marginBottom: tokens.spacing.lg,
//                             backgroundColor: theme.colors.surface2,
//                             borderRadius: tokens.borderRadius.lg,
//                             overflow: 'hidden',
//                             shadowColor: '#000',
//                             shadowOpacity: 0.1,
//                             shadowRadius: 6,
//                             elevation: 2,
//                           }}>
//                           <TouchableOpacity
//                             onPress={() => {
//                               ReactNativeHapticFeedback.trigger('impactMedium');
//                               setShopUrl(
//                                 prod.shopUrl ||
//                                   prod.product_link ||
//                                   p.previewUrl,
//                               );
//                             }}
//                             activeOpacity={0.9}>
//                             <Image
//                               source={{
//                                 uri:
//                                   prod.serpapi_thumbnail || // 🏆 always prefer SerpAPI’s proxy URL
//                                   prod.thumbnail || // Fallback: Google’s cached image
//                                   prod.image ||
//                                   prod.image_url ||
//                                   p.previewImage ||
//                                   'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//                               }}
//                               style={{
//                                 width: '100%',
//                                 height: 200,
//                                 borderTopLeftRadius: tokens.borderRadius.lg,
//                                 borderTopRightRadius: tokens.borderRadius.lg,
//                               }}
//                               resizeMode="cover"
//                             />

//                             {(prod.brand || p.previewBrand || prod.source) && (
//                               <View
//                                 style={{
//                                   position: 'absolute',
//                                   bottom: 0,
//                                   left: 0,
//                                   right: 0,
//                                   backgroundColor: 'rgba(0,0,0,0.45)',
//                                   paddingVertical: 4,
//                                 }}>
//                                 <Text
//                                   numberOfLines={1}
//                                   style={{
//                                     color: 'white',
//                                     fontWeight: '600',
//                                     fontSize: 12,
//                                     textAlign: 'center',
//                                   }}>
//                                   {prod.brand || p.previewBrand || prod.source}
//                                 </Text>
//                               </View>
//                             )}
//                           </TouchableOpacity>

//                           <View style={{padding: 10}}>
//                             <Text
//                               numberOfLines={1}
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               {prod.title || prod.name || p.item}
//                             </Text>
//                             {(prod.price || p.previewPrice) && (
//                               <Text
//                                 style={{
//                                   color: theme.colors.primary,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                   marginTop: 4,
//                                 }}>
//                                 {prod.price || p.previewPrice}
//                               </Text>
//                             )}
//                             {(prod.source || p.previewBrand) && (
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   opacity: 0.6,
//                                   fontSize: 10,
//                                   marginTop: 2,
//                                 }}>
//                                 Source: {prod.source || p.previewBrand}
//                               </Text>
//                             )}
//                           </View>
//                         </Animatable.View>
//                       ))}
//                     </View>
//                   </View>
//                 ))}
//               </>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* 🌐 Integrated overlay for in-app shop browsing */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import IntegratedShopOverlay from '../../components/ShopModal/IntegratedShopOverlay';

// export default function PersonalizedShopModal({
//   visible,
//   onClose,
//   purchases,
//   recreatedOutfit,
//   styleNote,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   purchases: any[];
//   recreatedOutfit?: any[];
//   styleNote?: string;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   // 💎 Gentle entry haptic
//   useEffect(() => {
//     if (visible) ReactNativeHapticFeedback.trigger('impactLight');
//   }, [visible]);

//   if (!visible) return null;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
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
//             padding: tokens.spacing.md,
//           }}>
//           {/* ✖️ Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 5,
//               right: 20,
//               zIndex: 999,
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

//           {/* 🧾 Content */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{paddingBottom: 80}}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 40}]}>
//               Personalized Finds
//             </Text>

//             {/* 🧠 Empty states */}
//             {!purchases?.length ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                     fontSize: 14,
//                   }}>
//                   Generating your personalized matches...
//                 </Text>
//               </View>
//             ) : (
//               <>
//                 {/* 👕 Recreated Outfit Section */}
//                 {recreatedOutfit?.length ? (
//                   <View style={{marginTop: 20, marginBottom: 10}}>
//                     <Text
//                       style={[
//                         globalStyles.sectionTitle,
//                         {marginBottom: tokens.spacing.sm},
//                       ]}>
//                       Your Recreated Look
//                     </Text>
//                     {recreatedOutfit.map((piece: any, i: number) => (
//                       <Text
//                         key={i}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 14,
//                           marginBottom: 2,
//                         }}>
//                         • {piece.category}: {piece.item} — {piece.color}
//                       </Text>
//                     ))}
//                     {styleNote ? (
//                       <Text
//                         style={{
//                           color: theme.colors.foreground,
//                           marginTop: 10,
//                           fontSize: 13,
//                           lineHeight: 18,
//                         }}>
//                         {styleNote}
//                       </Text>
//                     ) : null}
//                   </View>
//                 ) : null}

//                 {/* 🛍️ Product Groups */}
//                 {purchases.map((p, i) => (
//                   <View key={i} style={{marginTop: 25}}>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 16,
//                         fontWeight: '700',
//                         marginBottom: 4,
//                       }}>
//                       {p.item}
//                     </Text>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 13,
//                         marginBottom: 8,
//                         opacity: 0.8,
//                       }}>
//                       {p.color || ''} {p.material ? `• ${p.material}` : ''}
//                     </Text>

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         justifyContent: 'space-between',
//                         paddingBottom: 20,
//                       }}>
//                       {(p.products || []).map((prod: any, j: number) => (
//                         <TouchableOpacity
//                           key={j}
//                           onPress={() => {
//                             ReactNativeHapticFeedback.trigger('impactMedium');
//                             setShopUrl(prod.shopUrl);
//                           }}
//                           activeOpacity={0.85}
//                           style={{
//                             width: '48%',
//                             marginBottom: tokens.spacing.md,
//                             backgroundColor: theme.colors.surface2,
//                             borderRadius: tokens.borderRadius.lg,
//                             overflow: 'hidden',
//                           }}>
//                           {/* 🖼️ Image with robust fallbacks */}
//                           {/* <Image
//                             source={{
//                               uri:
//                                 prod.image ||
//                                 prod.image_url ||
//                                 prod.thumbnail ||
//                                 prod.img ||
//                                 p.image ||
//                                 p.products?.[0]?.image ||
//                                 'https://via.placeholder.com/400x400.png?text=No+Image',
//                             }}
//                             style={{
//                               width: '100%',
//                               height: 180,
//                               borderTopLeftRadius: tokens.borderRadius.lg,
//                               borderTopRightRadius: tokens.borderRadius.lg,
//                             }}
//                             resizeMode="cover"
//                           /> */}
//                           <Image
//                             source={{
//                               uri:
//                                 prod.image ||
//                                 prod.image_url ||
//                                 prod.thumbnail ||
//                                 prod.img ||
//                                 p.previewImage || // ✅ ADD THIS
//                                 p.image ||
//                                 p.products?.[0]?.image ||
//                                 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
//                             }}
//                             style={{
//                               width: '100%',
//                               height: 180,
//                               borderTopLeftRadius: tokens.borderRadius.lg,
//                               borderTopRightRadius: tokens.borderRadius.lg,
//                             }}
//                             resizeMode="cover"
//                           />

//                           {/* 🏷️ Brand overlay */}
//                           {(prod.brand || p.brand) && (
//                             <View
//                               style={{
//                                 position: 'absolute',
//                                 bottom: 0,
//                                 left: 0,
//                                 right: 0,
//                                 backgroundColor: 'rgba(0,0,0,0.45)',
//                                 paddingVertical: 4,
//                                 paddingHorizontal: 8,
//                               }}>
//                               <Text
//                                 numberOfLines={1}
//                                 style={{
//                                   color: 'white',
//                                   fontWeight: '600',
//                                   fontSize: 12,
//                                   textAlign: 'center',
//                                 }}>
//                                 {prod.brand || p.brand}
//                               </Text>
//                             </View>
//                           )}

//                           {/* 💬 Product info */}
//                           <View style={{padding: 8}}>
//                             <Text
//                               numberOfLines={1}
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               {prod.name || p.item}
//                             </Text>
//                             {prod.brand && (
//                               <Text
//                                 numberOfLines={1}
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   opacity: 0.7,
//                                   fontSize: 11,
//                                   marginTop: 2,
//                                 }}>
//                                 {prod.brand}
//                               </Text>
//                             )}
//                             {prod.price && (
//                               <Text
//                                 style={{
//                                   color: theme.colors.primary,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                   marginTop: 4,
//                                 }}>
//                                 {prod.price}
//                               </Text>
//                             )}
//                             {prod.source && (
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   opacity: 0.6,
//                                   fontSize: 10,
//                                   marginTop: 2,
//                                 }}>
//                                 Source: {prod.source}
//                               </Text>
//                             )}
//                           </View>
//                         </TouchableOpacity>
//                       ))}
//                     </View>
//                   </View>
//                 ))}
//               </>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* 🌐 Integrated overlay for in-app shop browsing */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

/////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import IntegratedShopOverlay from '../../components/ShopModal/IntegratedShopOverlay';

// export default function PersonalizedShopModal({
//   visible,
//   onClose,
//   purchases,
//   recreatedOutfit,
//   styleNote,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   purchases: any[];
//   recreatedOutfit?: any[];
//   styleNote?: string;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   // 💎 Gentle entry haptic
//   useEffect(() => {
//     if (visible) ReactNativeHapticFeedback.trigger('impactLight');
//   }, [visible]);

//   if (!visible) return null;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
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
//             padding: tokens.spacing.md,
//           }}>
//           {/* Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 5,
//               right: 20,
//               zIndex: 999,
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

//           {/* Content */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{paddingBottom: 80}}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 40}]}>
//               Personalized Finds
//             </Text>

//             {/* 🧠 Empty states */}
//             {!purchases?.length ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                     fontSize: 14,
//                   }}>
//                   Generating your personalized matches...
//                 </Text>
//               </View>
//             ) : (
//               <>
//                 {/* 🧥 Recreated Outfit Section */}
//                 {recreatedOutfit?.length ? (
//                   <View style={{marginTop: 20, marginBottom: 10}}>
//                     <Text
//                       style={[
//                         globalStyles.sectionTitle,
//                         {marginBottom: tokens.spacing.sm},
//                       ]}>
//                       Your Recreated Look
//                     </Text>
//                     {recreatedOutfit.map((piece: any, i: number) => (
//                       <Text
//                         key={i}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 14,
//                           marginBottom: 2,
//                         }}>
//                         • {piece.category}: {piece.item} — {piece.color}
//                       </Text>
//                     ))}
//                     {styleNote ? (
//                       <Text
//                         style={{
//                           color: theme.colors.foreground,
//                           marginTop: 10,
//                           fontSize: 13,
//                           lineHeight: 18,
//                         }}>
//                         {styleNote}
//                       </Text>
//                     ) : null}
//                   </View>
//                 ) : null}

//                 {/* 🛍️ Product Groups */}
//                 {purchases.map((p, i) => (
//                   <View key={i} style={{marginTop: 25}}>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 16,
//                         fontWeight: '700',
//                         marginBottom: 4,
//                       }}>
//                       {p.item}
//                     </Text>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 13,
//                         marginBottom: 8,
//                         opacity: 0.8,
//                       }}>
//                       {p.color || ''} {p.material ? `• ${p.material}` : ''}
//                     </Text>

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         justifyContent: 'space-between',
//                         paddingBottom: 20,
//                       }}>
//                       {(p.products || []).map((prod: any, j: number) => (
//                         <TouchableOpacity
//                           key={j}
//                           onPress={() => {
//                             ReactNativeHapticFeedback.trigger('impactMedium');
//                             setShopUrl(prod.shopUrl);
//                           }}
//                           activeOpacity={0.85}
//                           style={{
//                             width: '48%',
//                             marginBottom: tokens.spacing.md,
//                             backgroundColor: theme.colors.surface2,
//                             borderRadius: tokens.borderRadius.lg,
//                             overflow: 'hidden',
//                           }}>
//                           <Image
//                             source={{uri: prod.image}}
//                             style={{
//                               width: '100%',
//                               height: 180,
//                               borderTopLeftRadius: tokens.borderRadius.lg,
//                               borderTopRightRadius: tokens.borderRadius.lg,
//                             }}
//                             resizeMode="cover"
//                           />
//                           <View style={{padding: 8}}>
//                             <Text
//                               numberOfLines={1}
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               {prod.name}
//                             </Text>
//                             {prod.brand && (
//                               <Text
//                                 numberOfLines={1}
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   opacity: 0.7,
//                                   fontSize: 11,
//                                   marginTop: 2,
//                                 }}>
//                                 {prod.brand}
//                               </Text>
//                             )}
//                             {prod.price && (
//                               <Text
//                                 style={{
//                                   color: theme.colors.primary,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                   marginTop: 4,
//                                 }}>
//                                 {prod.price}
//                               </Text>
//                             )}
//                             {prod.source && (
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   opacity: 0.6,
//                                   fontSize: 10,
//                                   marginTop: 2,
//                                 }}>
//                                 Source: {prod.source}
//                               </Text>
//                             )}
//                           </View>
//                         </TouchableOpacity>
//                       ))}
//                     </View>
//                   </View>
//                 ))}
//               </>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* 🌐 Integrated overlay for in-app shop browsing */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {WebView} from 'react-native-webview';

// export default function PersonalizedShopModal({
//   visible,
//   onClose,
//   purchases,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   purchases: any[];
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);

//   if (!visible) return null;

//   // flatten all product arrays for a unified grid display
//   const allProducts =
//     purchases?.flatMap((p: any) =>
//       (p.products || []).map((prod: any) => ({
//         ...prod,
//         parentItem: p.item,
//         parentColor: p.color,
//         parentMaterial: p.material,
//       })),
//     ) || [];

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
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
//             padding: tokens.spacing.md,
//           }}>
//           {/* Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 5,
//               right: 20,
//               zIndex: 999,
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

//           <ScrollView showsVerticalScrollIndicator={false}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 40}]}>
//               Personalized Finds
//             </Text>

//             {/* 🧠 Empty state */}
//             {!purchases?.length ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                     fontSize: 14,
//                   }}>
//                   Generating your personalized matches...
//                 </Text>
//               </View>
//             ) : allProducts.length === 0 ? (
//               <View style={{alignItems: 'center', marginTop: 40}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     opacity: 0.7,
//                     fontSize: 15,
//                   }}>
//                   No personalized results yet.
//                 </Text>
//               </View>
//             ) : (
//               <>
//                 {purchases.map((p, i) => (
//                   <View key={i} style={{marginTop: 20}}>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 16,
//                         fontWeight: '700',
//                         marginBottom: 4,
//                       }}>
//                       {p.item}
//                     </Text>
//                     <Text
//                       style={{
//                         color: theme.colors.foreground,
//                         fontSize: 13,
//                         marginBottom: 8,
//                       }}>
//                       {p.color || ''} {p.material ? `• ${p.material}` : ''}
//                     </Text>

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         justifyContent: 'space-between',
//                         paddingBottom: 20,
//                       }}>
//                       {(p.products || []).map((prod: any, j: number) => (
//                         <TouchableOpacity
//                           key={j}
//                           onPress={() => {
//                             ReactNativeHapticFeedback.trigger('impactMedium');
//                             setShopUrl(prod.shopUrl);
//                           }}
//                           activeOpacity={0.85}
//                           style={{
//                             width: '48%',
//                             marginBottom: tokens.spacing.md,
//                             backgroundColor: theme.colors.surface2,
//                             borderRadius: tokens.borderRadius.lg,
//                             overflow: 'hidden',
//                           }}>
//                           <Image
//                             source={{uri: prod.image}}
//                             style={{
//                               width: '100%',
//                               height: 180,
//                               borderTopLeftRadius: tokens.borderRadius.lg,
//                               borderTopRightRadius: tokens.borderRadius.lg,
//                             }}
//                             resizeMode="cover"
//                           />
//                           <View style={{padding: 8}}>
//                             <Text
//                               numberOfLines={1}
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               {prod.name}
//                             </Text>
//                             {prod.brand && (
//                               <Text
//                                 numberOfLines={1}
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   opacity: 0.7,
//                                   fontSize: 11,
//                                   marginTop: 2,
//                                 }}>
//                                 {prod.brand}
//                               </Text>
//                             )}
//                             {prod.price && (
//                               <Text
//                                 style={{
//                                   color: theme.colors.primary,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                   marginTop: 4,
//                                 }}>
//                                 {prod.price}
//                               </Text>
//                             )}
//                             {prod.source && (
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   opacity: 0.6,
//                                   fontSize: 10,
//                                   marginTop: 2,
//                                 }}>
//                                 Source: {prod.source}
//                               </Text>
//                             )}
//                           </View>
//                         </TouchableOpacity>
//                       ))}
//                     </View>
//                   </View>
//                 ))}
//               </>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* Embedded WebView overlay for shop links */}
//         {shopUrl && (
//           <Modal visible transparent animationType="slide">
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: theme.colors.background,
//               }}>
//               <TouchableOpacity
//                 onPress={() => {
//                   ReactNativeHapticFeedback.trigger('impactLight');
//                   setShopUrl(null);
//                 }}
//                 style={{
//                   position: 'absolute',
//                   top: 50,
//                   right: 20,
//                   zIndex: 999,
//                   backgroundColor: theme.colors.foreground,
//                   borderRadius: 24,
//                   padding: 6,
//                 }}>
//                 <MaterialIcons
//                   name="close"
//                   size={22}
//                   color={theme.colors.background}
//                 />
//               </TouchableOpacity>
//               <WebView source={{uri: shopUrl}} startInLoadingState />
//             </View>
//           </Modal>
//         )}
//       </View>
//     </Modal>
//   );
// }

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   Linking,
//   StyleSheet,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {tokens} from '../../styles/tokens/tokens';

// export default function PersonalizedShopModal({
//   visible,
//   onClose,
//   purchases,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   purchases: any[];
// }) {
//   const {theme} = useAppTheme();

//   if (!visible) return null;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
//       <View
//         style={{
//           flex: 1,
//           backgroundColor: 'rgba(0,0,0,0.7)',
//           justifyContent: 'flex-end',
//         }}>
//         <View
//           style={{
//             backgroundColor: theme.colors.background,
//             borderTopLeftRadius: 24,
//             borderTopRightRadius: 24,
//             maxHeight: '90%',
//             paddingBottom: 40,
//           }}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//               paddingHorizontal: 20,
//               paddingVertical: 14,
//               borderBottomWidth: StyleSheet.hairlineWidth,
//               borderColor: theme.colors.surfaceBorder,
//             }}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontSize: 17,
//                 fontWeight: '700',
//               }}>
//               Personalized Finds
//             </Text>

//             <TouchableOpacity onPress={onClose}>
//               <MaterialIcons
//                 name="close"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </View>

//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 40}}>
//             {purchases?.length ? (
//               purchases.map((p, i) => (
//                 <View
//                   key={i}
//                   style={{
//                     marginTop: 20,
//                     borderWidth: tokens.borderWidth.md,
//                     borderColor: theme.colors.surfaceBorder,
//                     borderRadius: tokens.borderRadius.lg,
//                     padding: 12,
//                     backgroundColor: theme.colors.surface,
//                   }}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 15,
//                       fontWeight: '700',
//                       marginBottom: 6,
//                     }}>
//                     {p.item}
//                   </Text>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 13,
//                       marginBottom: 10,
//                     }}>
//                     {p.color} {p.material ? `• ${p.material}` : ''}
//                   </Text>

//                   {Array.isArray(p.products) &&
//                     p.products.map((prod: any, j: number) => (
//                       <TouchableOpacity
//                         key={j}
//                         onPress={() => Linking.openURL(prod.shopUrl)}
//                         style={{
//                           flexDirection: 'row',
//                           marginBottom: 10,
//                           borderRadius: tokens.borderRadius.md,
//                           overflow: 'hidden',
//                           backgroundColor: theme.colors.surface2,
//                         }}>
//                         <Image
//                           source={{uri: prod.image}}
//                           style={{width: 80, height: 80}}
//                         />
//                         <View
//                           style={{
//                             flex: 1,
//                             paddingHorizontal: 10,
//                             justifyContent: 'center',
//                           }}>
//                           <Text
//                             numberOfLines={2}
//                             style={{
//                               color: theme.colors.foreground,
//                               fontSize: 13,
//                               fontWeight: '600',
//                             }}>
//                             {prod.name}
//                           </Text>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontSize: 12,
//                             }}>
//                             {prod.brand} • {prod.price}
//                           </Text>
//                         </View>
//                       </TouchableOpacity>
//                     ))}
//                 </View>
//               ))
//             ) : (
//               <Text
//                 style={{
//                   color: theme.colors.foreground,
//                   fontSize: 14,
//                   textAlign: 'center',
//                   marginTop: 40,
//                 }}>
//                 No personalized results yet.
//               </Text>
//             )}
//           </ScrollView>
//         </View>
//       </View>
//     </Modal>
//   );
// }
