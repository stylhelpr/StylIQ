import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

type Props = {
  outfit?: any;
  onBack: () => void;
};

export default function TryOnPreviewScreen({outfit, onBack}: Props) {
  console.log('Received outfit:', outfit); // Debug

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>AR Try-On Preview</Text>

      <Image
        source={require('../assets/images/ar-preview-placeholder.png')}
        style={styles.mockImage}
        resizeMode="contain"
      />

      <Text style={styles.caption}>
        This is a static preview. AR feature coming soon.
      </Text>

      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back to Outfit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  mockImage: {
    width: '100%',
    height: 420,
    borderRadius: 12,
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 5,
  },
  caption: {
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  backButton: {
    marginTop: 28,
  },
  backText: {
    color: '#4ea1f2',
    fontSize: 16,
    fontWeight: '600',
  },
});

//////////

// import React from 'react';
// import {View, Text, Image, StyleSheet, ScrollView} from 'react-native';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Props = {
//   imageUri?: string;
//   outfit?: {
//     top?: WardrobeItem;
//     bottom?: WardrobeItem;
//     shoes?: WardrobeItem;
//   };
//   onBack: () => void;
// };

// export default function TryOnPreviewScreen({outfit, onBack}: Props) {
//   console.log('Received outfit:', outfit); // Debug

//   const renderItem = (label: string, item?: WardrobeItem) => {
//     if (!item) return null;
//     return (
//       <View style={styles.item}>
//         <Text style={styles.label}>{label}</Text>
//         <Image source={{uri: item.image}} style={styles.image} />
//         <Text style={styles.name}>{item.name}</Text>
//       </View>
//     );
//   };

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <Text style={styles.title}>AR Try-On Preview</Text>

//       {renderItem('Top', outfit?.top)}
//       {renderItem('Bottom', outfit?.bottom)}
//       {renderItem('Shoes', outfit?.shoes)}

//       {!outfit?.top && !outfit?.bottom && !outfit?.shoes && (
//         <Text style={styles.emptyState}>
//           No outfit data passed to AR preview.
//         </Text>
//       )}

//       <Text style={styles.caption}>
//         This is a static preview. AR feature coming soon.
//       </Text>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 16,
//     backgroundColor: '#000',
//     alignItems: 'center',
//   },
//   title: {
//     color: 'white',
//     fontSize: 24,
//     fontWeight: '600',
//     marginBottom: 20,
//   },
//   item: {
//     marginBottom: 24,
//     alignItems: 'center',
//   },
//   label: {
//     color: '#aaa',
//     fontSize: 14,
//     marginBottom: 4,
//   },
//   image: {
//     width: 200,
//     height: 200,
//     borderRadius: 12,
//     marginBottom: 8,
//     backgroundColor: '#222',
//   },
//   name: {
//     color: 'white',
//     fontWeight: '600',
//     fontSize: 16,
//   },
//   caption: {
//     color: '#888',
//     marginTop: 16,
//     textAlign: 'center',
//     fontSize: 14,
//   },
//   emptyState: {
//     color: 'gray',
//     marginTop: 40,
//     fontSize: 16,
//     textAlign: 'center',
//   },
// });

//////////

// import React from 'react';
// import {View, Text, Image, StyleSheet, ScrollView} from 'react-native';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Props = {
//   imageUri?: string; // still keep it if needed
//   outfit?: {
//     top?: WardrobeItem;
//     bottom?: WardrobeItem;
//     shoes?: WardrobeItem;
//   };
//   onBack: () => void;
// };

// export default function TryOnPreviewScreen({outfit, onBack}: Props) {
//   const renderItem = (label: string, item?: WardrobeItem) => {
//     if (!item) return null;
//     return (
//       <View style={styles.item}>
//         <Text style={styles.label}>{label}</Text>
//         <Image source={{uri: item.image}} style={styles.image} />
//         <Text style={styles.name}>{item.name}</Text>
//       </View>
//     );
//   };

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <Text style={styles.title}>AR Try-On Preview</Text>
//       {renderItem('Top', outfit?.top)}
//       {renderItem('Bottom', outfit?.bottom)}
//       {renderItem('Shoes', outfit?.shoes)}
//       <Text style={styles.caption}>AR view coming soon.</Text>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 16,
//     backgroundColor: '#000',
//     alignItems: 'center',
//   },
//   title: {
//     color: 'white',
//     fontSize: 24,
//     fontWeight: '600',
//     marginBottom: 20,
//   },
//   item: {
//     marginBottom: 24,
//     alignItems: 'center',
//   },
//   label: {
//     color: '#aaa',
//     fontSize: 14,
//   },
//   image: {
//     width: 200,
//     height: 200,
//     borderRadius: 12,
//     marginVertical: 8,
//   },
//   name: {
//     color: 'white',
//     fontWeight: '600',
//   },
//   caption: {
//     color: '#888',
//     marginTop: 16,
//     textAlign: 'center',
//   },
// });
