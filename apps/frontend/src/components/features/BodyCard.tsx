// BodyCard.tsx — StylIQ
// ✅ Separate upper vs lower scaling for realistic garment conversions

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

// 🔹 Conversion helpers
const cmToInches = (cm: number) => cm / 2.54;
const garmentInches = (cm: number) => Math.round(cmToInches(cm));

// 🔹 Sectional scale factors
const UPPER_SCALE = 1.0; // chest, shoulders
const LOWER_SCALE = 1.8; // waist, hips, inseam

type Props = {
  shoulders: number;
  chest: number;
  waist: number;
  hips: number;
  inseam: number;
  bg?: string;
  fg?: string;
};

export default function BodyCard({
  shoulders,
  chest,
  waist,
  hips,
  inseam,
  bg,
  fg,
}: Props) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      width: '90%',
      borderRadius: 22,
      paddingVertical: 18,
      paddingHorizontal: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
    },
    title: {fontSize: 24, fontWeight: '700', marginBottom: 16},
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    item: {width: '48%'},
    label: {fontSize: 18, opacity: 0.8, marginBottom: 4, fontWeight: '500'},
    value: {fontSize: 17, fontWeight: '700', marginBottom: 2},
    sub: {fontSize: 15, opacity: 0.6, fontWeight: '500'},
  });

  const renderValue = (label: string, value: number, scale: number) => {
    const scaled = value * scale;
    return (
      <View style={styles.item}>
        <Text style={[styles.label, {color: fg || theme.colors.foreground}]}>
          {label}
        </Text>
        <Text style={[styles.value, {color: fg || theme.colors.foreground}]}>
          {scaled.toFixed(1)} cm
        </Text>
        <Text style={[styles.sub, {color: fg || theme.colors.foreground}]}>
          ({cmToInches(scaled).toFixed(1)} in ≈ {garmentInches(scaled)}″)
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.card, {backgroundColor: bg || theme.colors.surface}]}>
      <Text style={[styles.title, {color: fg || theme.colors.foreground}]}>
        Body Summary
      </Text>

      <View style={styles.row}>
        {renderValue('Shoulders', shoulders, UPPER_SCALE)}
        {renderValue('Chest', chest, UPPER_SCALE)}
      </View>

      <View style={styles.row}>
        {renderValue('Waist', waist, LOWER_SCALE)}
        {renderValue('Hips', hips, LOWER_SCALE)}
      </View>

      <View style={styles.row}>
        {renderValue('Inseam', inseam, LOWER_SCALE)}
      </View>
    </View>
  );
}

////////////////

// // BodyCard.tsx — adds inch conversion display
// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../../utils/scale';

// const cmToInches = (cm: number) => cm / 2.54;
// const garmentInches = (cm: number) => Math.round(cmToInches(cm));

// type Props = {
//   shoulders: number;
//   chest: number;
//   waist: number;
//   hips: number;
//   inseam: number;
//   bg?: string;
//   fg?: string;
// };

// export default function BodyCard({
//   shoulders,
//   chest,
//   waist,
//   hips,
//   inseam,
//   bg,
//   fg,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     card: {
//       width: '90%',
//       borderRadius: 22,
//       paddingVertical: 18,
//       paddingHorizontal: 20,
//       marginBottom: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 10,
//       elevation: 5,
//     },
//     title: {fontSize: 24, fontWeight: '700', marginBottom: 16},
//     row: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 16,
//     },
//     item: {width: '48%'},
//     label: {fontSize: 18, opacity: 0.8, marginBottom: 4, fontWeight: 500},
//     value: {fontSize: 17, fontWeight: '700', marginBottom: 2},
//     sub: {fontSize: 15, opacity: 0.6, fontWeight: 500},
//   });

//   const renderValue = (label: string, value: number) => (
//     <View style={styles.item}>
//       <Text
//         style={[
//           styles.label,
//           {color: theme.colors.foreground || theme.colors.foreground},
//         ]}>
//         {label}
//       </Text>
//       <Text
//         style={[
//           styles.value,
//           {color: theme.colors.foreground || theme.colors.foreground},
//         ]}>
//         {value.toFixed(1)} cm
//       </Text>
//       <Text
//         style={[
//           styles.sub,
//           {color: theme.colors.foreground || theme.colors.foreground},
//         ]}>
//         ({cmToInches(value).toFixed(1)} in ≈ {garmentInches(value)}")
//       </Text>
//     </View>
//   );

//   return (
//     <View
//       style={[
//         styles.card,
//         {backgroundColor: theme.colors.surface || theme.colors.surface},
//       ]}>
//       <Text
//         style={[
//           styles.title,
//           {color: theme.colors.foreground || theme.colors.foreground},
//         ]}>
//         Body Summary
//       </Text>

//       <View style={styles.row}>
//         {renderValue('Shoulders', shoulders)}
//         {renderValue('Chest', chest)}
//       </View>

//       <View style={styles.row}>
//         {renderValue('Waist', waist)}
//         {renderValue('Hips', hips)}
//       </View>

//       <View style={styles.row}>{renderValue('Inseam', inseam)}</View>
//     </View>
//   );
// }

//////////////

// components/measurements/BodyCard.tsx
// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../../utils/scale';

// type Props = {
//   shoulders: number;
//   chest: number;
//   waist: number;
//   hips: number;
//   inseam: number;
//   color: string;
//   textColor: string;
// };

// export default function BodyCard({
//   shoulders,
//   chest,
//   waist,
//   hips,
//   inseam,
//   color,
//   textColor,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     card: {
//       width: '90%',
//       borderRadius: 22,
//       paddingVertical: 18,
//       paddingHorizontal: 20,
//       marginBottom: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 10,
//       elevation: 5,
//     },
//     title: {
//       fontSize: 22,
//       fontWeight: '700',
//       marginBottom: 16,
//     },
//     row: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//     },
//     item: {
//       width: '48%',
//     },
//     label: {
//       fontSize: 15,
//       opacity: 0.8,
//       marginBottom: 4,
//     },
//     value: {
//       fontSize: 20,
//       fontWeight: '700',
//     },
//   });

//   return (
//     <View style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//       <Text style={[styles.title, {color: theme.colors.foreground}]}>
//         Body Summary
//       </Text>

//       <View style={styles.row}>
//         <View style={styles.item}>
//           <Text style={[styles.label, {color: theme.colors.foreground}]}>
//             Shoulders
//           </Text>
//           <Text style={[styles.value, {color: theme.colors.foreground}]}>
//             {shoulders.toFixed(1)} cm
//           </Text>
//         </View>

//         <View style={styles.item}>
//           <Text style={[styles.label, {color: theme.colors.foreground}]}>
//             Chest
//           </Text>
//           <Text style={[styles.value, {color: theme.colors.foreground}]}>
//             {chest.toFixed(1)} cm
//           </Text>
//         </View>
//       </View>

//       <View style={styles.row}>
//         <View style={styles.item}>
//           <Text style={[styles.label, {color: theme.colors.foreground}]}>
//             Waist
//           </Text>
//           <Text style={[styles.value, {color: theme.colors.foreground}]}>
//             {waist.toFixed(1)} cm
//           </Text>
//         </View>

//         <View style={styles.item}>
//           <Text style={[styles.label, {color: theme.colors.foreground}]}>
//             Hips
//           </Text>
//           <Text style={[styles.value, {color: theme.colors.foreground}]}>
//             {hips.toFixed(1)} cm
//           </Text>
//         </View>
//       </View>

//       <View style={styles.row}>
//         <View style={styles.item}>
//           <Text style={[styles.label, {color: theme.colors.foreground}]}>
//             Inseam
//           </Text>
//           <Text style={[styles.value, {color: theme.colors.foreground}]}>
//             {inseam.toFixed(1)} cm
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// }

/////////////////

// // components/measurements/BodyCard.tsx
// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../../utils/scale';

// type Props = {
//   shoulders: number;
//   chest: number;
//   waist: number;
//   hips: number;
//   inseam: number;
//   color: string;
//   textColor: string;
// };

// export default function BodyCard({
//   shoulders,
//   chest,
//   waist,
//   hips,
//   inseam,
//   color,
//   textColor,
// }: Props) {
//   return (
//     <View style={[styles.card, {backgroundColor: color}]}>
//       <Text style={[styles.title, {color: textColor}]}>Body Summary</Text>

//       <View style={styles.row}>
//         <View style={styles.item}>
//           <Text style={[styles.label, {color: textColor}]}>Shoulders</Text>
//           <Text style={[styles.value, {color: textColor}]}>
//             {shoulders.toFixed(1)} cm
//           </Text>
//         </View>

//         <View style={styles.item}>
//           <Text style={[styles.label, {color: textColor}]}>Chest</Text>
//           <Text style={[styles.value, {color: textColor}]}>
//             {chest.toFixed(1)} cm
//           </Text>
//         </View>
//       </View>

//       <View style={styles.row}>
//         <View style={styles.item}>
//           <Text style={[styles.label, {color: textColor}]}>Waist</Text>
//           <Text style={[styles.value, {color: textColor}]}>
//             {waist.toFixed(1)} cm
//           </Text>
//         </View>

//         <View style={styles.item}>
//           <Text style={[styles.label, {color: textColor}]}>Hips</Text>
//           <Text style={[styles.value, {color: textColor}]}>
//             {hips.toFixed(1)} cm
//           </Text>
//         </View>
//       </View>

//       <View style={styles.row}>
//         <View style={styles.item}>
//           <Text style={[styles.label, {color: textColor}]}>Inseam</Text>
//           <Text style={[styles.value, {color: textColor}]}>
//             {inseam.toFixed(1)} cm
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   card: {
//     width: '90%',
//     borderRadius: 22,
//     paddingVertical: 18,
//     paddingHorizontal: 20,
//     marginBottom: 20,
//     shadowColor: '#000',
//     shadowOpacity: 0.15,
//     shadowRadius: 10,
//     elevation: 5,
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: '700',
//     marginBottom: 16,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 12,
//   },
//   item: {
//     width: '48%',
//   },
//   label: {
//     fontSize: 15,
//     opacity: 0.8,
//     marginBottom: 4,
//   },
//   value: {
//     fontSize: 20,
//     fontWeight: '700',
//   },
// });
