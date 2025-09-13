import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';

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

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1aff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
    borderRadius: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  source: {
    color: 'rgba(255, 15, 15, 1)',
    fontSize: 13,
    fontWeight: '600',
  },
  dot: {marginHorizontal: 6, color: 'rgba(255,255,255,0.35)'},
  time: {color: 'rgba(255,255,255,0.5)', fontSize: 12},
  content: {
    flexDirection: 'row',
    gap: 12,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  image: {
    width: 110,
    height: 78,
    borderRadius: 10,
  },
  imagePlaceholder: {
    width: 110,
    height: 78,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});

//////////////////

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
//     backgroundColor: '#000', // dark
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: 'rgba(255,255,255,0.06)',
//   },
//   meta: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 6,
//   },
//   source: {
//     color: 'rgba(255, 174, 0, 1)',
//     fontSize: 13,
//     fontWeight: '600',
//   },
//   dot: {marginHorizontal: 6, color: 'rgba(255,255,255,0.35)'},
//   time: {color: 'rgba(255,255,255,0.5)', fontSize: 12},
//   content: {
//     flexDirection: 'row',
//     gap: 12,
//   },
//   title: {
//     flex: 1,
//     color: '#fff',
//     fontSize: 17,
//     lineHeight: 22,
//     fontWeight: '700',
//   },
//   image: {
//     width: 110,
//     height: 78,
//     borderRadius: 10,
//   },
//   imagePlaceholder: {
//     width: 110,
//     height: 78,
//     borderRadius: 10,
//     backgroundColor: 'rgba(255,255,255,0.06)',
//   },
// });
