// apps/mobile/src/components/FashionFeed/TrendChips.tsx
import React from 'react';
import {ScrollView, Text, View, StyleSheet, Pressable} from 'react-native';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  items: string[];
  selected?: string | null;
  maxVisible?: number; // keep the row manageable
  onTap?: (term: string) => void; // filter action
  onMore?: () => void; // open Manage Brands
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

  const styles = StyleSheet.create({
    wrap: {paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#000'},
    row: {gap: 8, paddingHorizontal: 4, alignItems: 'center'},
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.12)',
      marginLeft: 4,
    },
    chipActive: {
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderColor: 'rgba(255,255,255,0.32)',
    },
    label: {color: '#ff0000ff', fontWeight: '600'},
    labelActive: {color: '#ffffffff'},
    moreChip: {backgroundColor: 'rgba(255,255,255,0.12)'},
  });

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {visible.map(term => {
          const isActive = selected?.toLowerCase() === term.toLowerCase();
          return (
            <Pressable
              key={term}
              onPress={() => onTap?.(term)}
              // style={[styles.chip, isActive && styles.chipActive]}
              style={[globalStyles.pill2, isActive && styles.chipActive]}
              android_ripple={{color: 'rgba(255,255,255,0.1)'}}>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {term}
              </Text>
            </Pressable>
          );
        })}

        {overflow > 0 && (
          <Pressable
            onPress={onMore}
            style={[styles.chip, styles.moreChip]}
            android_ripple={{color: 'rgba(255,255,255,0.1)'}}>
            <Text style={styles.label}>More (+{overflow})</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

///////////////////

// import React from 'react';
// import {
//   ScrollView,
//   Text,
//   View,
//   StyleSheet,
//   TouchableOpacity,
// } from 'react-native';

// export default function TrendChips({
//   items,
//   onTap,
// }: {
//   items: string[];
//   onTap?: (s: string) => void;
// }) {
//   if (!items?.length) return null;
//   return (
//     <View style={styles.wrap}>
//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         contentContainerStyle={styles.row}>
//         {items.map(t => (
//           <TouchableOpacity
//             key={t}
//             onPress={() => onTap?.(t)}
//             activeOpacity={0.8}
//             style={styles.chip}>
//             <Text style={styles.label}>{t}</Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   wrap: {paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#000'},
//   row: {gap: 8, paddingHorizontal: 4},
//   chip: {
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     borderRadius: 18,
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: 'rgba(255,255,255,0.12)',
//   },
//   label: {color: '#fff', fontWeight: '600'},
// });
