// components/SavedLookModal/SavedLookPreviewModal.tsx
import React from 'react';
import {Modal, View, Image, Text, StyleSheet} from 'react-native';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {useAppTheme} from '../../context/ThemeContext';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {tokens} from '../styles/tokens/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  look: {name: string; image_url: string} | null;
};

export default function SavedLookPreviewModal({visible, onClose, look}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    card: {
      width: '90%',
      borderRadius: 16,
      alignItems: 'center',
      padding: 16,
    },
    image: {
      width: '100%',
      height: undefined,
      aspectRatio: 3 / 4,
      borderRadius: 12,
      marginBottom: 12,
    },
    name: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginTop: 12,
      textAlign: 'center',
    },
    url: {
      fontSize: 12,
      color: theme.colors.foreground2,
      marginTop: 4,
      textAlign: 'center',
    },
    button: {
      marginTop: 16,
      backgroundColor: theme.colors.button1,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    buttonText: {color: theme.colors.buttonText1, fontWeight: '600'},
  });

  if (!look) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, globalStyles.cardStyles1]}>
          <Image
            source={{uri: look.image_url}}
            style={styles.image}
            resizeMode="contain"
          />
          <Text style={styles.name}>{look.name}</Text>
          <Text style={styles.url} numberOfLines={1}>
            {look.image_url}
          </Text>

          {/* ✅ light haptic on close */}
          <AppleTouchFeedback
            hapticStyle="impactLight"
            onPress={onClose}
            style={styles.button}>
            <Text style={styles.buttonText}>Close</Text>
          </AppleTouchFeedback>
        </View>
      </View>
    </Modal>
  );
}

////////////////////

// // components/SavedLookModal/SavedLookPreviewModal.tsx
// import React from 'react';
// import {
//   Modal,
//   View,
//   Image,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
//   look: {name: string; image_url: string} | null;
// };

// export default function SavedLookPreviewModal({visible, onClose, look}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   if (!look) return null;

//   return (
//     <Modal visible={visible} transparent animationType="fade">
//       <View style={styles.overlay}>
//         <View style={[styles.card, globalStyles.cardStyles1]}>
//           <Image
//             source={{uri: look.image_url}}
//             style={styles.image}
//             resizeMode="contain"
//           />
//           <Text style={styles.name}>{look.name}</Text>
//           <Text style={styles.url} numberOfLines={1}>
//             {look.image_url}
//           </Text>

//           <TouchableOpacity onPress={onClose} style={styles.button}>
//             <Text style={styles.buttonText}>Close</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.7)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   card: {
//     width: '90%',
//     borderRadius: 16,
//     alignItems: 'center',
//     padding: 16,
//   },
//   image: {
//     width: '100%',
//     height: undefined,
//     aspectRatio: 3 / 4,
//     borderRadius: 12,
//     marginBottom: 12,
//   },
//   name: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#fff',
//     marginTop: 12,
//     textAlign: 'center',
//   },
//   url: {
//     fontSize: 12,
//     color: '#aaa',
//     marginTop: 4,
//     textAlign: 'center',
//   },
//   button: {
//     marginTop: 16,
//     backgroundColor: '#5d00ff',
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//   },
//   buttonText: {color: '#fff', fontWeight: '600'},
// });

///////////////

// // components/SavedLookModal/SavedLookPreviewModal.tsx
// import React from 'react';
// import {
//   Modal,
//   View,
//   Image,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
//   look: {name: string; image_url: string} | null;
// };

// export default function SavedLookPreviewModal({visible, onClose, look}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   if (!look) return null;

//   return (
//     <Modal visible={visible} transparent animationType="fade">
//       <View style={styles.overlay}>
//         <View style={[styles.card, globalStyles.cardStyles1]}>
//           <Image
//             source={{uri: look.image_url}}
//             style={styles.image}
//             resizeMode="cover"
//           />
//           <Text style={styles.name}>{look.name}</Text>
//           <Text style={styles.url} numberOfLines={1}>
//             {look.image_url}
//           </Text>

//           <TouchableOpacity onPress={onClose} style={styles.button}>
//             <Text style={styles.buttonText}>Close</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.7)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   card: {
//     width: '90%',
//     borderRadius: 16,
//     alignItems: 'center',
//     padding: 16,
//   },
//   image: {
//     width: '100%',
//     height: 280,
//     borderRadius: 12,
//   },
//   name: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#fff',
//     marginTop: 12,
//     textAlign: 'center',
//   },
//   url: {
//     fontSize: 12,
//     color: '#aaa',
//     marginTop: 4,
//     textAlign: 'center',
//   },
//   button: {
//     marginTop: 16,
//     backgroundColor: '#5d00ff',
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//   },
//   buttonText: {color: '#fff', fontWeight: '600'},
// });
