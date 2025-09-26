import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import {WebView} from 'react-native-webview';
import * as Animatable from 'react-native-animatable';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {BlurView} from '@react-native-community/blur';

const {height} = Dimensions.get('window');

export default function ReaderModal({
  visible,
  url,
  onClose,
  title,
}: {
  visible: boolean;
  url?: string;
  title?: string;
  onClose: () => void;
}) {
  if (!url) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Background overlay */}
        <Animatable.View
          animation="fadeIn"
          duration={300}
          style={styles.backdrop}
        />

        {/* Sliding panel */}
        <Animatable.View
          animation="slideInUp"
          duration={650}
          easing="ease-out-cubic"
          style={styles.panel}>
          {/* Frosted header */}
          <BlurView
            style={styles.header}
            blurType="dark"
            blurAmount={20}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
            <Text numberOfLines={1} style={styles.title}>
              {title || 'Article'}
            </Text>
            <AppleTouchFeedback
              onPress={onClose}
              hapticStyle="impactLight"
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <Text style={styles.close}>Done</Text>
            </AppleTouchFeedback>
          </BlurView>

          {/* Animated WebView */}
          <Animatable.View
            animation="fadeIn"
            delay={250}
            duration={800}
            style={{flex: 1}}>
            <WebView source={{uri: url}} style={{flex: 1}} />
          </Animatable.View>
        </Animatable.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    flex: 1,
    backgroundColor: '#000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: -8},
    elevation: 20,
  },
  header: {
    height: 56,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
    flex: 1,
    textAlign: 'left',
  },
  close: {
    color: '#0A84FF',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 12,
  },
});

/////////////////////

// import React from 'react';
// import {
//   Modal,
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   SafeAreaView,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// export default function ReaderModal({
//   visible,
//   url,
//   onClose,
//   title,
// }: {
//   visible: boolean;
//   url?: string;
//   title?: string;
//   onClose: () => void;
// }) {
//   if (!url) return null;
//   return (
//     <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
//       <SafeAreaView style={styles.sa}>
//         <View style={styles.header}>
//           <Text numberOfLines={1} style={styles.title}>
//             {title || 'Article'}
//           </Text>
//           <AppleTouchFeedback
//             onPress={onClose}
//             hapticStyle="impactLight"
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <Text style={styles.close}>Done</Text>
//           </AppleTouchFeedback>
//         </View>
//         <WebView source={{uri: url}} style={{flex: 1}} />
//       </SafeAreaView>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   sa: {flex: 1, backgroundColor: '#000'},
//   header: {
//     height: 48,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 12,
//     borderBottomColor: 'rgba(255,255,255,0.08)',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//   },
//   title: {color: '#fff', fontWeight: '700', fontSize: 16, flex: 1},
//   close: {color: '#0A84FF', fontWeight: '700', marginLeft: 12},
// });

/////////////////

// import React from 'react';
// import {
//   Modal,
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   SafeAreaView,
// } from 'react-native';
// import {WebView} from 'react-native-webview';

// export default function ReaderModal({
//   visible,
//   url,
//   onClose,
//   title,
// }: {
//   visible: boolean;
//   url?: string;
//   title?: string;
//   onClose: () => void;
// }) {
//   if (!url) return null;
//   return (
//     <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
//       <SafeAreaView style={styles.sa}>
//         <View style={styles.header}>
//           <Text numberOfLines={1} style={styles.title}>
//             {title || 'Article'}
//           </Text>
//           <TouchableOpacity
//             onPress={onClose}
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <Text style={styles.close}>Done</Text>
//           </TouchableOpacity>
//         </View>
//         <WebView source={{uri: url}} style={{flex: 1}} />
//       </SafeAreaView>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   sa: {flex: 1, backgroundColor: '#000'},
//   header: {
//     height: 48,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 12,
//     borderBottomColor: 'rgba(255,255,255,0.08)',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//   },
//   title: {color: '#fff', fontWeight: '700', fontSize: 16, flex: 1},
//   close: {color: '#0A84FF', fontWeight: '700', marginLeft: 12},
// });
