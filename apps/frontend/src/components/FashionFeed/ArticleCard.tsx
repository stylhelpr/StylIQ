import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  title: string;
  source: string;
  onPress: () => void;
  image?: string;
  time?: string; // "3h ago"
};

export default function ArticleCard({
  title,
  source,
  onPress,
  image,
  time,
}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    row: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      marginBottom: 12,
      borderRadius: 12,
      borderWidth: tokens.borderWidth.md,
      borderColor: theme.colors.surfaceBorder,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    source: {
      color: theme.colors.foreground3,
      fontSize: 13,
      fontWeight: '600',
    },
    dot: {marginHorizontal: 6, color: 'rgba(255,255,255,0.35)'},
    time: {color: theme.colors.foreground2, fontSize: 12},
    content: {
      flexDirection: 'row',
    },
    title: {
      flex: 1,
      color: theme.colors.foreground,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '700',
      marginRight: 20,
    },
    image: {
      width: 120,
      height: 120,
      borderRadius: 10,
      marginTop: -20,
    },
    imagePlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.06)',
      marginTop: -20,
    },
  });
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.row}>
      <View style={styles.meta}>
        <Text style={styles.source}>{source}</Text>
        {time ? <Text style={styles.dot}>•</Text> : null}
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>

      <View style={styles.content}>
        <Text numberOfLines={3} style={styles.title}>
          {title}
        </Text>
        {image ? (
          <Image source={{uri: image}} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
      </View>
    </TouchableOpacity>
  );
}

////////////////////

// import React from 'react';
// import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';

// type Props = {
//   title: string;
//   source: string;
//   onPress: () => void;
//   image?: string;
//   time?: string; // "3h ago"
// };

// export default function ArticleCard({
//   title,
//   source,
//   onPress,
//   image,
//   time,
// }: Props) {
//   return (
//     <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.row}>
//       <View style={styles.meta}>
//         <Text style={styles.source}>{source}</Text>
//         {time ? <Text style={styles.dot}>•</Text> : null}
//         {time ? <Text style={styles.time}>{time}</Text> : null}
//       </View>

//       <View style={styles.content}>
//         <Text numberOfLines={3} style={styles.title}>
//           {title}
//         </Text>
//         {image ? (
//           <Image source={{uri: image}} style={styles.image} />
//         ) : (
//           <View style={styles.imagePlaceholder} />
//         )}
//       </View>
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   row: {
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     backgroundColor: '#1b1b1bff',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: 'rgba(255,255,255,0.06)',
//     marginBottom: 12,
//     borderRadius: 12,
//   },
//   meta: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 6,
//   },
//   source: {
//     color: 'rgba(255, 255, 255, 1)',
//     fontSize: 13,
//     fontWeight: '600',
//   },
//   dot: {marginHorizontal: 6, color: 'rgba(255,255,255,0.35)'},
//   time: {color: 'rgba(255,255,255,0.5)', fontSize: 12},
//   content: {
//     flexDirection: 'row',
//   },
//   title: {
//     flex: 1,
//     color: '#fff',
//     fontSize: 17,
//     lineHeight: 22,
//     fontWeight: '700',
//     marginRight: 20, // ⬅️ adds breathing room from the image
//   },
//   image: {
//     width: 120,
//     height: 120,
//     borderRadius: 10,
//     marginTop: -20,
//   },
//   imagePlaceholder: {
//     width: 120,
//     height: 120,
//     borderRadius: 10,
//     backgroundColor: 'rgba(255,255,255,0.06)',
//     marginTop: -20,
//   },
// });
