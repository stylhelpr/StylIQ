/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {WebView} from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import IntegratedShopOverlay from './IntegratedShopOverlay';
import {useGlobalStyles} from '../../styles/useGlobalStyles';

export default function ShopModal({
  visible,
  onClose,
  results,
}: {
  visible: boolean;
  onClose: () => void;
  results: any[];
}) {
  const {theme} = useAppTheme();
  const [shopUrl, setShopUrl] = useState<string | null>(null);
  const globalStyles = useGlobalStyles();

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
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
          duration={300}
          style={{
            width: '100%',
            maxWidth: 700,
            height: '90%',
            backgroundColor: theme.colors.background,
            borderRadius: tokens.borderRadius['2xl'],
            overflow: 'hidden',
            padding: tokens.spacing.md,
          }}>
          {/* Close */}
          <TouchableOpacity
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              onClose();
            }}
            style={{
              position: 'absolute',
              top: 8,
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

          {/* Product Grid */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text
              numberOfLines={1}
              style={[globalStyles.sectionTitle, {marginTop: 0}]}>
              Shop the Vibe
            </Text>

            {results.length === 0 ? (
              <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text
                  style={{
                    color: theme.colors.foreground,
                    marginTop: 12,
                    opacity: 0.7,
                  }}>
                  Fetching products...
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  paddingBottom: 80,
                }}>
                {results.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      ReactNativeHapticFeedback.trigger('impactMedium');
                      setShopUrl(item.shopUrl);
                    }}
                    activeOpacity={0.85}
                    style={{
                      width: '48%',
                      marginBottom: tokens.spacing.md,
                      backgroundColor: theme.colors.surface,
                      borderRadius: tokens.borderRadius.lg,
                      overflow: 'hidden',
                      borderColor: theme.colors.muted,
                      borderWidth: tokens.borderWidth.md,
                    }}>
                    <Image
                      source={{uri: item.image}}
                      style={{
                        width: '100%',
                        height: 180,
                        borderTopLeftRadius: tokens.borderRadius.lg,
                        borderTopRightRadius: tokens.borderRadius.lg,
                      }}
                      resizeMode="cover"
                    />
                    <View style={{padding: 8}}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: theme.colors.foreground,
                          fontWeight: '600',
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
                            marginTop: 2,
                          }}>
                          {item.brand}
                        </Text>
                      )}
                      {item.price && (
                        <Text
                          style={{
                            color: theme.colors.primary,
                            fontWeight: '600',
                            fontSize: 13,
                            marginTop: 4,
                          }}>
                          {item.price}
                        </Text>
                      )}
                      {item.source && (
                        <Text
                          style={{
                            color: theme.colors.foreground,
                            opacity: 0.6,
                            fontSize: 10,
                            marginTop: 2,
                          }}>
                          Source: {item.source}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </Animatable.View>

        {/* WebView modal */}
        <IntegratedShopOverlay
          visible={!!shopUrl}
          onClose={() => setShopUrl(null)}
          url={shopUrl}
        />
      </View>
    </Modal>
  );
}

///////////////////////////

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
//   SafeAreaView,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {WebView} from 'react-native-webview';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import IntegratedShopOverlay from './IntegratedShopOverlay';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// export default function ShopModal({
//   visible,
//   onClose,
//   results,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   results: any[];
// }) {
//   const {theme} = useAppTheme();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const globalStyles = useGlobalStyles();

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

//           {/* Product Grid */}
//           <ScrollView showsVerticalScrollIndicator={false}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 40}]}>
//               Shop the Vibe
//             </Text>

//             {results.length === 0 ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                   }}>
//                   Fetching products...
//                 </Text>
//               </View>
//             ) : (
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'space-between',
//                   paddingBottom: 80,
//                 }}>
//                 {results.map((item, idx) => (
//                   <TouchableOpacity
//                     key={idx}
//                     onPress={() => {
//                       ReactNativeHapticFeedback.trigger('impactMedium');
//                       setShopUrl(item.shopUrl);
//                     }}
//                     activeOpacity={0.85}
//                     style={{
//                       width: '48%',
//                       marginBottom: tokens.spacing.md,
//                       backgroundColor: theme.colors.surface2,
//                       borderRadius: tokens.borderRadius.lg,
//                       overflow: 'hidden',
//                     }}>
//                     <Image
//                       source={{uri: item.image}}
//                       style={{
//                         width: '100%',
//                         height: 180,
//                         borderTopLeftRadius: tokens.borderRadius.lg,
//                         borderTopRightRadius: tokens.borderRadius.lg,
//                       }}
//                       resizeMode="cover"
//                     />
//                     <View style={{padding: 8}}>
//                       <Text
//                         numberOfLines={1}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontWeight: '600',
//                           fontSize: 13,
//                         }}>
//                         {item.name}
//                       </Text>
//                       {item.brand && (
//                         <Text
//                           numberOfLines={1}
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.7,
//                             fontSize: 11,
//                             marginTop: 2,
//                           }}>
//                           {item.brand}
//                         </Text>
//                       )}
//                       {item.price && (
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '600',
//                             fontSize: 13,
//                             marginTop: 4,
//                           }}>
//                           {item.price}
//                         </Text>
//                       )}
//                       {item.source && (
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.6,
//                             fontSize: 10,
//                             marginTop: 2,
//                           }}>
//                           Source: {item.source}
//                         </Text>
//                       )}
//                     </View>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* WebView modal */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }
