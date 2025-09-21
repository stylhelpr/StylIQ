// apps/frontend/src/screens/WebPageScreen.tsx
import React, {useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {WebView} from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';

type Props = {
  route?: {params?: {url?: string; title?: string}};
  navigate?: (screen: string, params?: any) => void; // <- from your RootNavigator
};

export default function WebPageScreen({route, navigate}: Props) {
  const {theme} = useAppTheme();
  const url = route?.params?.url;
  const title = route?.params?.title ?? 'Web Page';

  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  const onNavStateChange = useCallback((navState: any) => {
    setCanGoBack(!!navState.canGoBack);
  }, []);

  const handleBack = useCallback(() => {
    if (canGoBack && webRef.current) {
      webRef.current.goBack();
    } else if (navigate) {
      // go back in your app — adjust target if you want a different screen
      navigate('Settings');
    }
  }, [canGoBack, navigate]);

  if (!url) {
    return (
      <View style={[styles.center, {backgroundColor: theme.colors.background}]}>
        <Text style={{color: theme.colors.foreground}}>No URL provided</Text>
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: theme.colors.background}}>
      {/* Lightweight header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.muted,
          },
        ]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleBack}
          activeOpacity={0.7}>
          <MaterialIcons
            name="arrow-back-ios"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={[styles.headerBtnText, {color: theme.colors.primary}]}>
            Back
          </Text>
        </TouchableOpacity>
        <Text
          numberOfLines={1}
          style={[styles.headerTitle, {color: theme.colors.foreground}]}>
          {title}
        </Text>
        {/* right spacer to balance layout */}
        <View style={styles.headerRightSpacer} />
      </View>

      <WebView
        ref={webRef}
        source={{uri: url}}
        style={{flex: 1}}
        onNavigationStateChange={onNavStateChange}
        startInLoadingState
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        renderLoading={() => (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={styles.loader}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loader: {marginTop: 20},
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    minWidth: 70,
  },
  headerBtnText: {fontSize: 15, fontWeight: '600', marginLeft: 2},
  headerTitle: {flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600'},
  headerRightSpacer: {width: 70}, // balances the back button area
});

/////////////////

// import React from 'react';
// import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
// import {WebView} from 'react-native-webview';
// import {useAppTheme} from '../context/ThemeContext';

// type Props = {
//   route?: {params?: {url?: string; title?: string}};
// };

// export default function WebPageScreen({route}: Props) {
//   const {theme} = useAppTheme();
//   const url = route?.params?.url;
//   const title = route?.params?.title ?? 'Web Page';

//   if (!url) {
//     // Guard so the screen won’t crash if opened without params
//     return (
//       <View style={[styles.center, {backgroundColor: theme.colors.background}]}>
//         <Text style={{color: theme.colors.foreground}}>No URL provided</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <WebView
//         source={{uri: url}}
//         style={{flex: 1}}
//         startInLoadingState
//         renderLoading={() => (
//           <ActivityIndicator
//             size="large"
//             color={theme.colors.primary}
//             style={styles.loader}
//           />
//         )}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loader: {
//     marginTop: 20,
//   },
// });
