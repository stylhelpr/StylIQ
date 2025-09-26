// components/SavedLookModal/SavedLookPreviewModal.tsx
import React from 'react';
import {Modal, View, Image, Text, StyleSheet} from 'react-native';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {useAppTheme} from '../../context/ThemeContext';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {tokens} from '../../styles/tokens/tokens';

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
        <View
          style={[
            globalStyles.cardStyles1,
            {
              width: '90%',
              borderRadius: tokens.borderRadius['2xl'],
              alignItems: 'center',
              borderColor: theme.colors.surfaceBorder,
            },
          ]}>
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 18,
              paddingHorizontal: 6,
            }}>
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
            <View style={{marginBottom: -4}}>
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={onClose}
                style={[styles.button]}>
                <Text style={styles.buttonText}>Close</Text>
              </AppleTouchFeedback>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/////////////////

// // components/SavedLookModal/SavedLookPreviewModal.tsx
// import React from 'react';
// import {Modal, View, Image, Text, StyleSheet} from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
//   look: {name: string; image_url: string} | null;
// };

// export default function SavedLookPreviewModal({visible, onClose, look}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.7)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 20,
//     },
//     image: {
//       width: '100%',
//       height: undefined,
//       aspectRatio: 3 / 4,
//       borderRadius: 12,
//       marginBottom: 12,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginTop: 12,
//       textAlign: 'center',
//     },
//     url: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       marginTop: 4,
//       textAlign: 'center',
//     },
//     button: {
//       marginTop: 16,
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 10,
//       paddingHorizontal: 20,
//       borderRadius: 8,
//     },
//     buttonText: {color: theme.colors.buttonText1, fontWeight: '600'},
//   });

//   if (!look) return null;

//   return (
//     <Modal visible={visible} transparent animationType="fade">
//       <View style={styles.overlay}>
//         <View
//           style={[
//             globalStyles.cardStyles1,
//             {
//               width: '90%',
//               borderRadius: tokens.borderRadius['2xl'],
//               alignItems: 'center',
//               borderColor: theme.colors.surfaceBorder,
//             },
//           ]}>
//           <View
//             style={{
//               alignItems: 'center',
//               paddingVertical: 18,
//               paddingHorizontal: 6,
//             }}>
//             <Image
//               source={{uri: look.image_url}}
//               style={styles.image}
//               resizeMode="contain"
//             />
//             <Text style={styles.name}>{look.name}</Text>
//             <Text style={styles.url} numberOfLines={1}>
//               {look.image_url}
//             </Text>

//             {/* ✅ light haptic on close */}
//             <View style={{marginBottom: -4}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={onClose}
//                 style={[styles.button]}>
//                 <Text style={styles.buttonText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );
// }
