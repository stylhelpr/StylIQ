import React, {useState} from 'react';
import {
  Modal,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import {useUUID} from '../../context/UUIDContext';
import {API_BASE_URL} from '../../config/api';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function SaveLookModal({visible, onClose}: Props) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const userId = useUUID();
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    card: {
      width: '85%',
      backgroundColor: theme.colors.surface,
      padding: 20,
      borderRadius: 12,
    },
    title: {fontSize: 18, fontWeight: '700', marginBottom: 18},
    input: {
      borderWidth: 1,
      borderColor: theme.colors.inputText1,
      borderRadius: 6,
      padding: 10,
      marginBottom: 12,
    },
    button: {
      backgroundColor: theme.colors.button1,
      padding: 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    buttonText: {color: theme.colors.buttonText1, fontWeight: '600'},
  });

  const handleSave = async () => {
    if (!url || !userId) return;

    h('impactMedium'); // haptic on save tap

    try {
      const res = await fetch(`${API_BASE_URL}/saved-looks`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          image_url: url,
          name: name || 'Saved Look',
        }),
      });
      const data = await res.json();
      console.log('✅ Saved look:', data);

      h('notificationSuccess'); // success confirmation

      setUrl('');
      setName('');
      onClose();
    } catch (err) {
      console.error('❌ Failed to save look:', err);
      h('notificationError'); // error feedback
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay]}>
        <View
          style={[
            styles.card,
            globalStyles.cardStyles1,
            {
              paddingVertical: 36,
              paddingHorizontal: 22,
              borderRadius: tokens.borderRadius['2xl'],
            },
          ]}>
          <Text
            style={[
              styles.title,
              {textAlign: 'center', color: theme.colors.foreground},
            ]}>
            Save a Look
          </Text>

          <Text
            style={[
              globalStyles.label,
              {
                paddingHorizontal: 1,
                marginBottom: 17,
                fontSize: 12,
                fontWeight: '400',
                color: theme.colors.foreground,
              },
            ]}>
            Find any image online, right-click "Copy Image Address", then paste
            that address into the "Image Address" field below to save a look.
          </Text>

          <TextInput
            style={[styles.input, {color: theme.colors.foreground}]}
            placeholder="Name (optional)"
            placeholderTextColor={theme.colors.muted}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={[styles.input, {color: theme.colors.foreground}]}
            placeholder="Image Address"
            placeholderTextColor={theme.colors.muted}
            value={url}
            onChangeText={setUrl}
          />

          <TouchableOpacity
            style={[styles.button, {marginVertical: 4, marginTop: 10}]}
            onPress={handleSave}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              h('selection'); // light tap on cancel
              onClose();
            }}>
            <Text
              style={[
                {
                  color: theme.colors.foreground,
                  marginTop: 10,
                  textAlign: 'center',
                },
              ]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

////////////////

// import React, {useState} from 'react';
// import {
//   Modal,
//   View,
//   TextInput,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useUUID} from '../../context/UUIDContext';
// import {API_BASE_URL} from '../../config/api';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
// };

// export default function SaveLookModal({visible, onClose}: Props) {
//   const [url, setUrl] = useState('');
//   const [name, setName] = useState('');
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.6)',
//     },
//     card: {
//       width: '85%',
//       backgroundColor: '#fff',
//       padding: 20,
//       borderRadius: 12,
//     },
//     title: {fontSize: 18, fontWeight: '700', marginBottom: 10},
//     input: {
//       borderWidth: 1,
//       borderColor: '#ccc',
//       borderRadius: 6,
//       padding: 10,
//       marginBottom: 12,
//     },
//     button: {
//       backgroundColor: theme.colors.button1,
//       padding: 12,
//       borderRadius: 6,
//       alignItems: 'center',
//     },
//     buttonText: {color: '#fff', fontWeight: '600'},
//   });

//   const handleSave = async () => {
//     if (!url || !userId) return;
//     try {
//       const res = await fetch(`${API_BASE_URL}/saved-looks`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: url,
//           name: name || 'Saved Look',
//         }),
//       });
//       const data = await res.json();
//       console.log('✅ Saved look:', data);
//       setUrl('');
//       setName('');
//       onClose();
//     } catch (err) {
//       console.error('❌ Failed to save look:', err);
//     }
//   };

//   return (
//     <Modal visible={visible} transparent animationType="slide">
//       <View style={[styles.overlay]}>
//         <View
//           style={[
//             styles.card,
//             globalStyles.cardStyles1,
//             {paddingVertical: 36, paddingHorizontal: 22},
//           ]}>
//           <Text style={[styles.title, {textAlign: 'center', color: 'white'}]}>
//             Save a Look
//           </Text>
//           <TextInput
//             style={[styles.input, {color: 'white'}]}
//             placeholder="Name (optional)"
//             placeholderTextColor="white"
//             value={name}
//             onChangeText={setName}
//           />
//           <TextInput
//             style={[styles.input, {color: 'white'}]}
//             placeholder="Image Address"
//             placeholderTextColor="white"
//             value={url}
//             onChangeText={setUrl}
//           />

//           <TouchableOpacity
//             style={[styles.button, {marginVertical: 4}]}
//             onPress={handleSave}>
//             <Text style={styles.buttonText}>Save</Text>
//           </TouchableOpacity>
//           <TouchableOpacity onPress={onClose}>
//             <Text
//               style={[
//                 {color: '#5d00ffff', marginTop: 10, textAlign: 'center'},
//               ]}>
//               Cancel
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }
