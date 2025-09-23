import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {WebView} from 'react-native-webview';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.sa}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.title}>
            {title || 'Article'}
          </Text>
          <AppleTouchFeedback
            onPress={onClose}
            hapticStyle="impactLight"
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text style={styles.close}>Done</Text>
          </AppleTouchFeedback>
        </View>
        <WebView source={{uri: url}} style={{flex: 1}} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sa: {flex: 1, backgroundColor: '#000'},
  header: {
    height: 48,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {color: '#fff', fontWeight: '700', fontSize: 16, flex: 1},
  close: {color: '#0A84FF', fontWeight: '700', marginLeft: 12},
});

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
