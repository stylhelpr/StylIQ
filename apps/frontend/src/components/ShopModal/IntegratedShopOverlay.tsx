/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {Modal, View, TouchableOpacity, SafeAreaView} from 'react-native';
import {WebView} from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type IntegratedShopOverlayProps = {
  visible: boolean;
  onClose: () => void;
  url: string | null;
};

export default function IntegratedShopOverlay({
  visible,
  onClose,
  url,
}: IntegratedShopOverlayProps) {
  const {theme} = useAppTheme();
  if (!visible || !url) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen">
      <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.surface}}>
        {/* Close Button */}
        <TouchableOpacity
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight');
            onClose();
          }}
          style={{
            position: 'absolute',
            top: 120,
            right: 16,
            zIndex: 999,
            backgroundColor: theme.colors.foreground,
            borderRadius: 24,
            padding: 6,
          }}>
          <MaterialIcons
            name="close"
            size={22}
            color={theme.colors.background}
          />
        </TouchableOpacity>

        {/* WebView */}
        <WebView source={{uri: url}} startInLoadingState style={{flex: 1}} />
      </SafeAreaView>
    </Modal>
  );
}

///////////////

// /* eslint-disable react-native/no-inline-styles */
// import React from 'react';
// import {Modal, View, TouchableOpacity, SafeAreaView} from 'react-native';
// import {WebView} from 'react-native-webview';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type IntegratedShopOverlayProps = {
//   visible: boolean;
//   onClose: () => void;
//   url: string | null;
// };

// export default function IntegratedShopOverlay({
//   visible,
//   onClose,
//   url,
// }: IntegratedShopOverlayProps) {
//   const {theme} = useAppTheme();
//   if (!visible || !url) return null;

//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       presentationStyle="fullScreen">
//       <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.surface}}>
//         {/* Close Button */}
//         <TouchableOpacity
//           onPress={() => {
//             ReactNativeHapticFeedback.trigger('impactLight');
//             onClose();
//           }}
//           style={{
//             position: 'absolute',
//             top: 120,
//             right: 16,
//             zIndex: 999,
//             backgroundColor: theme.colors.background,
//             borderRadius: 24,
//             padding: 6,
//           }}>
//           <MaterialIcons name="close" size={26} color="white" />
//         </TouchableOpacity>

//         {/* WebView */}
//         <WebView source={{uri: url}} startInLoadingState style={{flex: 1}} />
//       </SafeAreaView>
//     </Modal>
//   );
// }
