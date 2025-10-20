// import React, {useRef} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';

// // 🔊 Shared global reference
// export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
//   current: null,
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   globalTtsRef.current = ref;

//   return (
//     <View style={styles.root}>
//       {/* App content (normal layout) */}
//       <RootNavigator />

//       {/* ✅ Invisible persistent TTS WebView — completely detached from layout */}
//       <View pointerEvents="none" style={styles.ttsContainer}>
//         <WebView
//           ref={ref}
//           originWhitelist={['*']}
//           allowsInlineMediaPlayback
//           mediaPlaybackRequiresUserAction={false}
//           javaScriptEnabled
//           source={{html: '<html><body></body></html>'}}
//           style={styles.hiddenWebView}
//         />
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   root: {flex: 1},
//   ttsContainer: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: -9999, // push far behind everything
//   },
//   hiddenWebView: {
//     width: 1,
//     height: 1,
//     opacity: 0,
//   },
// });

// export default MainApp;

/////////////////////

import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';

const MainApp = () => <RootNavigator />;

export default MainApp;
