import React, {useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

type WardrobeItem = {
  id: string;
  name: string;
  image: string; // Can be local or remote
};

type Props = {
  outfit?: {
    top?: WardrobeItem;
    bottom?: WardrobeItem;
    shoes?: WardrobeItem;
  };
  onBack: () => void;
};

export default function TryOnPreviewScreen({outfit, onBack}: Props) {
  useEffect(() => {
    console.log('🧠 outfit received in TryOnPreview:', outfit);
  }, [outfit]);

  const userPhoto = require('../assets/images/full-body-temp1.png'); // Replace with correct path
  const shirtImage = outfit?.top?.image
    ? // ? {uri: outfit.top.image}
      // : require('../assets/images/striped-shirt1.png');
      require('../assets/images/striped-shirt1.png')
    : {uri: outfit.top.image};

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
    imageWrapper: {
      width: '100%',
      aspectRatio: 3 / 4,
      position: 'relative',
      marginBottom: 20,
    },
    body: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      zIndex: 1,
    },
    shirt: {
      position: 'absolute',
      width: '58%',
      height: '35%',
      top: '27%',
      left: '21%',
      zIndex: 2,
      opacity: 0.98,
      borderRadius: 4,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: {width: 0, height: 4},
      elevation: 4,
    },
    caption: {
      color: '#888',
      textAlign: 'center',
      fontSize: 14,
      marginTop: 12,
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>AR Try-On Preview</Text>

      <View style={styles.imageWrapper}>
        <Image source={userPhoto} style={styles.body} resizeMode="contain" />
        <Image source={shirtImage} style={styles.shirt} resizeMode="contain" />
      </View>

      <Text style={styles.caption}>
        This is a static mock showing your shirt over your body image.
      </Text>

      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back to Closet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

//////////////

// import React, {useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Dimensions,
// } from 'react-native';

// type WardrobeItem = {
//   image: string;
//   name: string;
// };

// type Outfit = {
//   top?: WardrobeItem;
//   bottom?: WardrobeItem;
//   shoes?: WardrobeItem;
// };

// type Props = {
//   outfit?: Outfit;
//   onBack: () => void;
// };

// export default function TryOnPreviewScreen({outfit, onBack}: Props) {
//   useEffect(() => {
//     console.log('🧠 outfit received in TryOnPreview:', outfit);
//   }, [outfit]);

//   const PREVIEW_WIDTH = Dimensions.get('window').width * 0.85;

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <Text style={styles.title}>AR Try-On Preview</Text>

//       <View style={[styles.previewContainer, {width: PREVIEW_WIDTH}]}>
//         <Image
//           source={require('../assets/images/full-body-temp1.png')}
//           style={styles.baseFigure}
//         />

//         {/* Top */}
//         {outfit?.top && (
//           <Image
//             source={{uri: outfit.top.image}}
//             style={[
//               styles.overlayImage,
//               {
//                 width: '50%',
//                 aspectRatio: 3 / 4,
//                 top: '24%',
//                 left: '25%',
//               },
//             ]}
//           />
//         )}

//         {/* Bottom */}
//         {outfit?.bottom && (
//           <Image
//             source={{uri: outfit.bottom.image}}
//             style={[
//               styles.overlayImage,
//               {
//                 width: '50%',
//                 aspectRatio: 2.8 / 4,
//                 top: '55%',
//                 left: '25%',
//               },
//             ]}
//           />
//         )}

//         {/* Shoes */}
//         {outfit?.shoes && (
//           <Image
//             source={{uri: outfit.shoes.image}}
//             style={[
//               styles.overlayImage,
//               {
//                 width: '35%',
//                 aspectRatio: 2.5 / 1,
//                 bottom: '2%',
//                 left: '32.5%',
//               },
//             ]}
//           />
//         )}
//       </View>

//       <Text style={styles.caption}>
//         This is a static preview. AR feature coming soon.
//       </Text>

//       <TouchableOpacity onPress={onBack} style={styles.backButton}>
//         <Text style={styles.backText}>← Back to Closet</Text>
//       </TouchableOpacity>
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
//   previewContainer: {
//     height: Dimensions.get('window').width * 1.6,
//     position: 'relative',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   baseFigure: {
//     width: '100%',
//     height: '100%',
//     resizeMode: 'contain',
//     position: 'absolute',
//   },
//   overlayImage: {
//     position: 'absolute',
//     resizeMode: 'contain',
//   },
//   caption: {
//     color: '#888',
//     marginTop: 16,
//     textAlign: 'center',
//     fontSize: 14,
//   },
//   backButton: {
//     marginTop: 28,
//   },
//   backText: {
//     color: '#4ea1f2',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });
