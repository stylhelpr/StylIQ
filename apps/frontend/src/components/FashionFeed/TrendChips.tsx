import React, {useRef} from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'; // 👈 add this
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

type Props = {
  items: string[];
  selected?: string | null;
  maxVisible?: number;
  onTap?: (term: string) => void;
  onMore?: () => void;
};

export default function TrendChips({
  items,
  selected = null,
  maxVisible = 20,
  onTap,
  onMore,
}: Props) {
  if (!items?.length) return null;

  const visible = items.slice(0, maxVisible);
  const overflow = Math.max(items.length - visible.length, 0);
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const styles = StyleSheet.create({
    wrap: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      // backgroundColor: theme.colors.background,
    },
    row: {
      gap: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      backgroundColor: theme.colors.pillDark2,
      elevation: 3,
    },
    chipActive: {
      backgroundColor: theme.colors.foreground,
      borderColor: theme.colors.surfaceBorder,
      shadowColor: theme.colors.button1,
      shadowOpacity: 0.45,
      shadowRadius: 10,
    },
    label: {color: theme.colors.pillTextColor1, fontWeight: '600'},
    labelActive: {color: theme.colors.button1},
    moreChip: {backgroundColor: theme.colors.pillDark2},
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const GLOBAL_DELAY = 800; // 👈 chips start animating 600 ms later

  return (
    <Animatable.View animation="fadeIn" duration={500} delay={GLOBAL_DELAY}>
      <View style={styles.wrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToAlignment="start"
          contentContainerStyle={styles.row}>
          {visible.map((term, idx) => {
            const isActive = selected?.toLowerCase() === term.toLowerCase();
            return (
              <Animatable.View
                key={term}
                animation="slideInRight"
                duration={700}
                delay={GLOBAL_DELAY + idx * 90}
                easing="ease-out-cubic"
                useNativeDriver>
                <Animated.View style={{transform: [{scale: scaleAnim}]}}>
                  {/* 🟣 Add haptics + press animation */}
                  <Pressable
                    onPressIn={() => {
                      handlePressIn();
                      ReactNativeHapticFeedback.trigger('impactLight');
                    }}
                    onPressOut={handlePressOut}
                    onPress={() => {
                      ReactNativeHapticFeedback.trigger('impactMedium');
                      onTap?.(term);
                    }}
                    style={[
                      styles.chip,
                      globalStyles.pill2,
                      isActive && styles.chipActive,
                    ]}
                    android_ripple={{color: 'rgba(255,255,255,0.1)'}}>
                    <Text
                      style={[styles.label, isActive && styles.labelActive]}>
                      {term}
                    </Text>
                  </Pressable>
                </Animated.View>
              </Animatable.View>
            );
          })}

          {overflow > 0 && (
            <Animatable.View
              animation="slideInRight"
              duration={700}
              delay={GLOBAL_DELAY + visible.length * 90 + 120}
              useNativeDriver>
              <Pressable
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactMedium'); // 👈 haptic on “More”
                  onMore?.();
                }}
                style={[styles.chip, styles.moreChip]}
                android_ripple={{color: 'rgba(255,255,255,0.1)'}}>
                <Text style={styles.label}>More (+{overflow})</Text>
              </Pressable>
            </Animatable.View>
          )}
        </ScrollView>
      </View>
    </Animatable.View>
  );
}

//////////////////

// // apps/mobile/src/components/FashionFeed/TrendChips.tsx
// import React, {useRef} from 'react';
// import {
//   ScrollView,
//   Text,
//   View,
//   StyleSheet,
//   Pressable,
//   Animated,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   items: string[];
//   selected?: string | null;
//   maxVisible?: number;
//   onTap?: (term: string) => void;
//   onMore?: () => void;
// };

// export default function TrendChips({
//   items,
//   selected = null,
//   maxVisible = 20,
//   onTap,
//   onMore,
// }: Props) {
//   if (!items?.length) return null;

//   const visible = items.slice(0, maxVisible);
//   const overflow = Math.max(items.length - visible.length, 0);
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const scaleAnim = useRef(new Animated.Value(1)).current;

//   const styles = StyleSheet.create({
//     wrap: {
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       backgroundColor: theme.colors.background,
//     },
//     row: {
//       gap: 8,
//       paddingHorizontal: 4,
//       alignItems: 'center',
//     },
//     chip: {
//       paddingHorizontal: 14,
//       paddingVertical: 8,
//       borderRadius: 20,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.pillDark2,
//       elevation: 3,
//     },
//     chipActive: {
//       backgroundColor: theme.colors.foreground,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: theme.colors.button1,
//       shadowOpacity: 0.45,
//       shadowRadius: 10,
//     },
//     label: {color: theme.colors.pillTextColor1, fontWeight: '600'},
//     labelActive: {color: theme.colors.button1},
//     moreChip: {backgroundColor: theme.colors.pillDark2},
//   });

//   const handlePressIn = () => {
//     Animated.spring(scaleAnim, {
//       toValue: 0.95,
//       useNativeDriver: true,
//       speed: 20,
//       bounciness: 8,
//     }).start();
//   };

//   const handlePressOut = () => {
//     Animated.spring(scaleAnim, {
//       toValue: 1,
//       useNativeDriver: true,
//       speed: 20,
//       bounciness: 10,
//     }).start();
//   };

//   const GLOBAL_DELAY = 800; // 👈 chips start animating 600 ms later

//   return (
//     <Animatable.View animation="fadeIn" duration={500} delay={GLOBAL_DELAY}>
//       <View style={styles.wrap}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           decelerationRate="fast"
//           snapToAlignment="start"
//           contentContainerStyle={styles.row}>
//           {visible.map((term, idx) => {
//             const isActive = selected?.toLowerCase() === term.toLowerCase();
//             return (
//               <Animatable.View
//                 key={term}
//                 animation="slideInRight"
//                 duration={700}
//                 delay={GLOBAL_DELAY + idx * 90} // 👈 global delay + stagger
//                 easing="ease-out-cubic"
//                 useNativeDriver>
//                 <Animated.View style={{transform: [{scale: scaleAnim}]}}>
//                   <Pressable
//                     onPressIn={handlePressIn}
//                     onPressOut={handlePressOut}
//                     onPress={() => onTap?.(term)}
//                     style={[
//                       styles.chip,
//                       globalStyles.pill2,
//                       isActive && styles.chipActive,
//                     ]}
//                     android_ripple={{color: 'rgba(255,255,255,0.1)'}}>
//                     <Text
//                       style={[styles.label, isActive && styles.labelActive]}>
//                       {term}
//                     </Text>
//                   </Pressable>
//                 </Animated.View>
//               </Animatable.View>
//             );
//           })}

//           {overflow > 0 && (
//             <Animatable.View
//               animation="slideInRight"
//               duration={700}
//               delay={GLOBAL_DELAY + visible.length * 90 + 120}
//               useNativeDriver>
//               <Pressable
//                 onPress={onMore}
//                 style={[styles.chip, styles.moreChip]}
//                 android_ripple={{color: 'rgba(255,255,255,0.1)'}}>
//                 <Text style={styles.label}>More (+{overflow})</Text>
//               </Pressable>
//             </Animatable.View>
//           )}
//         </ScrollView>
//       </View>
//     </Animatable.View>
//   );
// }

//////////////////

// // apps/mobile/src/components/FashionFeed/TrendChips.tsx
// import React from 'react';
// import {ScrollView, Text, View, StyleSheet, Pressable} from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   items: string[];
//   selected?: string | null;
//   maxVisible?: number; // keep the row manageable
//   onTap?: (term: string) => void; // filter action
//   onMore?: () => void; // open Manage Brands
// };

// export default function TrendChips({
//   items,
//   selected = null,
//   maxVisible = 20,
//   onTap,
//   onMore,
// }: Props) {
//   if (!items?.length) return null;

//   const visible = items.slice(0, maxVisible);
//   const overflow = Math.max(items.length - visible.length, 0);

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     wrap: {
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       backgroundColor: theme.colors.background,
//     },
//     row: {gap: 8, paddingHorizontal: 4, alignItems: 'center'},
//     chip: {
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       backgroundColor: 'theme.colors.pillDark2',
//       borderRadius: 18,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       marginLeft: 4,
//     },
//     chipActive: {
//       backgroundColor: theme.colors.foreground,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     label: {color: theme.colors.pillTextColor1, fontWeight: '600'},
//     labelActive: {color: theme.colors.button1},
//     moreChip: {backgroundColor: theme.colors.pillDark2},
//   });

//   return (
//     <View style={styles.wrap}>
//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         contentContainerStyle={styles.row}>
//         {visible.map(term => {
//           const isActive = selected?.toLowerCase() === term.toLowerCase();
//           return (
//             <Pressable
//               key={term}
//               onPress={() => onTap?.(term)}
//               style={[globalStyles.pill2, isActive && styles.chipActive]}
//               android_ripple={{color: 'rgba(255,255,255,0.1)'}}>
//               <Text style={[styles.label, isActive && styles.labelActive]}>
//                 {term}
//               </Text>
//             </Pressable>
//           );
//         })}

//         {overflow > 0 && (
//           <Pressable
//             onPress={onMore}
//             style={[styles.chip, styles.moreChip]}
//             android_ripple={{color: 'rgba(255,255,255,0.1)'}}>
//             <Text style={styles.label}>More (+{overflow})</Text>
//           </Pressable>
//         )}
//       </ScrollView>
//     </View>
//   );
// }

///////////////////

// apps/mobile/src/components/FashionFeed/TrendChips.tsx
// import React from 'react';
// import {ScrollView, Text, View, StyleSheet, Pressable} from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   items: string[];
//   selected?: string | null;
//   maxVisible?: number; // keep the row manageable
//   onTap?: (term: string) => void; // filter action
//   onMore?: () => void; // open Manage Brands
// };

// export default function TrendChips({
//   items,
//   selected = null,
//   maxVisible = 20,
//   onTap,
//   onMore,
// }: Props) {
//   if (!items?.length) return null;

//   const visible = items.slice(0, maxVisible);
//   const overflow = Math.max(items.length - visible.length, 0);

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     wrap: {paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#000'},
//     row: {gap: 8, paddingHorizontal: 4, alignItems: 'center'},
//     chip: {
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       backgroundColor: 'rgba(255, 255, 255, 0.14)',
//       borderRadius: 18,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: 'rgba(255,255,255,0.12)',
//       marginLeft: 4,
//     },
//     chipActive: {
//       backgroundColor: 'rgba(255,255,255,0.18)',
//       borderColor: 'rgba(255,255,255,0.32)',
//     },
//     label: {color: '#ff0000ff', fontWeight: '600'},
//     labelActive: {color: '#ffffffff'},
//     moreChip: {backgroundColor: 'rgba(255,255,255,0.12)'},
//   });

//   return (
//     <View style={styles.wrap}>
//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         contentContainerStyle={styles.row}>
//         {visible.map(term => {
//           const isActive = selected?.toLowerCase() === term.toLowerCase();
//           return (
//             <Pressable
//               key={term}
//               onPress={() => onTap?.(term)}
//               // style={[styles.chip, isActive && styles.chipActive]}
//               style={[globalStyles.pill2, isActive && styles.chipActive]}
//               android_ripple={{color: 'rgba(255,255,255,0.1)'}}>
//               <Text style={[styles.label, isActive && styles.labelActive]}>
//                 {term}
//               </Text>
//             </Pressable>
//           );
//         })}

//         {overflow > 0 && (
//           <Pressable
//             onPress={onMore}
//             style={[styles.chip, styles.moreChip]}
//             android_ripple={{color: 'rgba(255,255,255,0.1)'}}>
//             <Text style={styles.label}>More (+{overflow})</Text>
//           </Pressable>
//         )}
//       </ScrollView>
//     </View>
//   );
// }
