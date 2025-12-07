// GhostOverlay.tsx — StylIQ (Precise 2-Axis Alignment Version)
// Centers front and side overlays visually to match the AR camera framing

import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';

interface GhostOverlayProps {
  mode: 'front' | 'side';
  isStable: boolean;
}

const silhouetteImages: Record<'front' | 'side', ImageSourcePropType> = {
  front: require('../../assets/silhouettes/silhouette_front.png'),
  side: require('../../assets/silhouettes/silhouette_side.png'),
};

export default function GhostOverlay({mode, isStable}: GhostOverlayProps) {
  const source = silhouetteImages[mode];

  // 🔧 Fine-tuned visual correction for side view
  //  - translateX pulls overlay slightly right (camera shift compensation)
  //  - translateY lifts overlay slightly up (low camera compensation)
  const offset =
    mode === 'side'
      ? {
          transform: [
            {translateX: -Dimensions.get('window').width * 0.14}, // move further right (5%)
            {translateY: Dimensions.get('window').height * 0.02}, // move lower (10%)
          ],
        }
      : null;

  return (
    <View style={styles.container}>
      <Image
        source={source}
        style={[
          styles.silhouette,
          offset,
          {
            tintColor: isStable
              ? 'rgba(0,255,0,0.6)'
              : 'rgba(255,255,255,0.35)',
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  silhouette: {
    width: '70%',
    height: '88%',
    opacity: 1,
  },
});

///////////////////

// // GhostOverlay.tsx — StylIQ (Final production version)
// // Displays body silhouette overlay for alignment guidance

// import React from 'react';
// import {View, Image, StyleSheet, ImageSourcePropType} from 'react-native';

// interface GhostOverlayProps {
//   mode: 'front' | 'side';
//   isStable: boolean;
// }

// const silhouetteImages: Record<'front' | 'side', ImageSourcePropType> = {
//   front: require('../../assets/silhouettes/silhouette_front.png'),
//   side: require('../../assets/silhouettes/silhouette_side.png'),
// };

// export default function GhostOverlay({mode, isStable}: GhostOverlayProps) {
//   const source = silhouetteImages[mode];

//   return (
//     <View style={styles.container}>
//       <Image
//         source={source}
//         style={[
//           styles.silhouette,
//           {
//             tintColor: isStable
//               ? 'rgba(0,255,0,0.6)' // green tint when stable
//               : 'rgba(255,255,255,0.35)', // white tint while aligning
//           },
//         ]}
//         resizeMode="contain"
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     ...StyleSheet.absoluteFillObject,
//     alignItems: 'center',
//     justifyContent: 'center',
//     pointerEvents: 'none',
//   },
//   silhouette: {
//     // visually proportioned like Apple’s AR body guide overlay
//     width: '70%',
//     height: '88%',
//     opacity: 1,
//   },
// });

////////////////

// // GhostOverlay.tsx — StylIQ
// // Fully compatible with ARKit + RN overlay structure

// import React from 'react';
// import {View, Image, StyleSheet, ImageSourcePropType} from 'react-native';

// interface GhostOverlayProps {
//   mode: 'front' | 'side';
//   isStable: boolean;
// }

// const silhouetteImages: Record<'front' | 'side', ImageSourcePropType> = {
//   front: require('../../assets/silhouettes/silhouette_front.png'),
//   side: require('../../assets/silhouettes/silhouette_side.png'),
// };

// export default function GhostOverlay({mode, isStable}: GhostOverlayProps) {
//   const source = silhouetteImages[mode];

//   return (
//     <View style={styles.container}>
//       <Image
//         source={source}
//         style={[
//           styles.silhouette,
//           {
//             tintColor: isStable
//               ? 'rgba(0,255,0,0.6)' // green tint when stable
//               : 'rgba(255,255,255,0.4)', // white tint when aligning
//           },
//         ]}
//         resizeMode="contain"
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     ...StyleSheet.absoluteFillObject,
//     alignItems: 'center',
//     justifyContent: 'center',
//     pointerEvents: 'none',
//   },
//   silhouette: {
//     width: '75%',
//     height: '85%',
//     opacity: 1,
//   },
// });

///////////////////

// // GhostOverlay.tsx
// // StylIQ

// import React from 'react';
// import {View, StyleSheet} from 'react-native';

// interface Props {
//   joints?: Record<string, number[]>;
// }

// function GhostOverlay({joints}: Props) {
//   return (
//     <View pointerEvents="none" style={styles.overlay}>
//       {/* Ghost frame */}
//       <View style={styles.frame} />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   frame: {
//     width: 200,
//     height: 400,
//     borderWidth: 2,
//     borderColor: 'rgba(0,255,0,0.35)',
//     borderRadius: 16,
//   },
// });

// export default GhostOverlay;
