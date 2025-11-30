import React, {useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import {WebView} from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';
import {SafeAreaView} from 'react-native-safe-area-context';

const {width: screenWidth} = Dimensions.get('window');

type Props = {
  route?: {params?: {url?: string; title?: string}};
  navigate?: (screen: any, params?: any) => void;
};

// Popular shopping sites — customize as needed
const SHOPPING_SITES = [
  {name: 'Amazon', url: 'https://amazon.com', icon: 'shopping-bag'},
  {name: 'ASOS', url: 'https://asos.com', icon: 'shopping-bag'},
  {name: 'H&M', url: 'https://hm.com', icon: 'shopping-bag'},
  {name: 'Zara', url: 'https://zara.com', icon: 'shopping-bag'},
  {name: 'Shein', url: 'https://shein.com', icon: 'shopping-bag'},
  {name: 'SSENSE', url: 'https://ssense.com', icon: 'shopping-bag'},
  {name: 'Farfetch', url: 'https://farfetch.com', icon: 'shopping-bag'},
  {name: 'Google', url: 'https://google.com', icon: 'search'},
];

export default function WebBrowserScreen({route, navigate}: Props) {
  const {theme} = useAppTheme();

  const initialUrl = route?.params?.url || '';
  const [url, setUrl] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [inputValue, setInputValue] = useState(initialUrl);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(!initialUrl);

  const webRef = useRef<WebView>(null);

  const normalizeUrl = useCallback((text: string): string => {
    let normalized = text.trim();

    // If it starts with http:// or https://, use as-is
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }

    // If it looks like a domain, add https://
    if (normalized.includes('.') && !normalized.includes(' ')) {
      return `https://${normalized}`;
    }

    // Otherwise, search via Google
    return `https://google.com/search?q=${encodeURIComponent(normalized)}`;
  }, []);

  const handleUrlSubmit = useCallback(() => {
    const normalized = normalizeUrl(inputValue);
    setUrl(normalized);
    setShowSuggestions(false);
  }, [inputValue, normalizeUrl]);

  const handleQuickShop = useCallback((shopUrl: string) => {
    setUrl(shopUrl);
    setInputValue(shopUrl);
    setShowSuggestions(false);
  }, []);

  const onNavStateChange = useCallback((navState: any) => {
    setCanGoBack(!!navState.canGoBack);
    setCanGoForward(!!navState.canGoForward);
    setCurrentUrl(navState.url);
    setInputValue(navState.url);
  }, []);

  const handleBack = useCallback(() => {
    if (canGoBack && webRef.current) {
      webRef.current.goBack();
    } else if (navigate) {
      navigate('Home');
    }
  }, [canGoBack, navigate]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      marginTop: 60,
    },
    header: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    headerContent: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    backButton: {
      padding: 8,
      marginRight: 4,
    },
    titleAndClose: {
      flex: 1,
      marginRight: 8,
    },
    title: {
      color: theme.colors.foreground,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    urlDisplay: {
      color: theme.colors.foreground3,
      fontSize: 11,
      maxWidth: '90%',
    },
    closeButton: {
      padding: 8,
    },
    urlBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      paddingHorizontal: 12,
      marginBottom: 8,
      height: 36,
    },
    searchIcon: {
      marginRight: 8,
    },
    urlInput: {
      flex: 1,
      color: theme.colors.foreground,
      fontSize: 14,
      padding: 0,
    },
    controlsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    controlButton: {
      padding: 8,
      opacity: 0.6,
    },
    controlButtonActive: {
      opacity: 1,
    },
    suggestionsContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    suggestionsTitle: {
      color: theme.colors.foreground2,
      fontSize: 13,
      fontWeight: '600',
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 12,
    },
    shoppingGrid: {
      paddingHorizontal: 8,
    },
    shoppingButton: {
      alignItems: 'center',
      justifyContent: 'center',
      margin: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      minWidth: (screenWidth - 48) / 2,
    },
    shoppingButtonText: {
      color: theme.colors.foreground,
      fontSize: 13,
      fontWeight: '500',
      marginTop: 8,
      textAlign: 'center',
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Top bar with back button and close */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[styles.backButton, !canGoBack && {opacity: 0.4}]}
              onPress={handleBack}
              disabled={!canGoBack && !navigate}>
              <MaterialIcons
                name="arrow-back-ios"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>

            <View style={styles.titleAndClose}>
              <Text style={styles.title}>StylHelpr Browser</Text>
              <Text style={styles.urlDisplay} numberOfLines={1}>
                {currentUrl || 'Ready to browse'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigate?.('Home')}>
              <MaterialIcons
                name="close"
                size={20}
                color={theme.colors.foreground2}
              />
            </TouchableOpacity>
          </View>

          {/* URL Bar */}
          <View style={styles.urlBar}>
            <MaterialIcons
              name="search"
              size={18}
              color={theme.colors.foreground3}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.urlInput}
              placeholder="Search or enter URL"
              placeholderTextColor={theme.colors.foreground3}
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleUrlSubmit}
              onFocus={() => setShowSuggestions(!url)}
              returnKeyType="go"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {inputValue && (
              <TouchableOpacity onPress={() => setInputValue('')}>
                <MaterialIcons
                  name="clear"
                  size={16}
                  color={theme.colors.foreground3}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Controls Bar */}
          <View style={styles.controlsBar}>
            <View style={{flexDirection: 'row'}}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  canGoBack && styles.controlButtonActive,
                ]}
                onPress={() => webRef.current?.goBack()}
                disabled={!canGoBack}>
                <MaterialIcons
                  name="arrow-back"
                  size={20}
                  color={theme.colors.primary}
                  style={{opacity: canGoBack ? 1 : 0.4}}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.controlButton,
                  canGoForward && styles.controlButtonActive,
                ]}
                onPress={() => webRef.current?.goForward()}
                disabled={!canGoForward}>
                <MaterialIcons
                  name="arrow-forward"
                  size={20}
                  color={theme.colors.primary}
                  style={{opacity: canGoForward ? 1 : 0.4}}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => webRef.current?.reload()}>
                <MaterialIcons
                  name="refresh"
                  size={20}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            {isLoading && (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            )}
          </View>
        </View>
      </View>

      {/* WebView or Suggestions */}
      {!url || showSuggestions ? (
        <ScrollView style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Popular Shopping Sites</Text>
          <View
            style={[
              styles.shoppingGrid,
              {flexDirection: 'row', flexWrap: 'wrap'},
            ]}>
            {SHOPPING_SITES.map(site => (
              <TouchableOpacity
                key={site.name}
                style={styles.shoppingButton}
                onPress={() => handleQuickShop(site.url)}>
                <MaterialIcons
                  name={site.icon}
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.shoppingButtonText}>{site.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <WebView
          ref={webRef}
          source={{uri: url}}
          style={{flex: 1}}
          onNavigationStateChange={onNavStateChange}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          startInLoadingState
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          renderLoading={() => (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
        />
      )}
    </SafeAreaView>
  );
}

///////////////////

// import React, {useRef, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ActivityIndicator,
//   TouchableOpacity,
//   TextInput,
//   ScrollView,
//   Dimensions,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {SafeAreaView} from 'react-native-safe-area-context';

// const {width: screenWidth} = Dimensions.get('window');

// type Props = {
//   route?: {params?: {url?: string; title?: string}};
//   navigate?: (screen: any, params?: any) => void;
// };

// // Popular shopping sites — customize as needed
// const SHOPPING_SITES = [
//   {name: 'Amazon', url: 'https://amazon.com', icon: 'shopping-bag'},
//   {name: 'ASOS', url: 'https://asos.com', icon: 'shopping-bag'},
//   {name: 'H&M', url: 'https://hm.com', icon: 'shopping-bag'},
//   {name: 'Zara', url: 'https://zara.com', icon: 'shopping-bag'},
//   {name: 'Shein', url: 'https://shein.com', icon: 'shopping-bag'},
//   {name: 'SSENSE', url: 'https://ssense.com', icon: 'shopping-bag'},
//   {name: 'Farfetch', url: 'https://farfetch.com', icon: 'shopping-bag'},
//   {name: 'Google', url: 'https://google.com', icon: 'search'},
// ];

// export default function WebBrowserScreen({route, navigate}: Props) {
//   const {theme} = useAppTheme();

//   const initialUrl = route?.params?.url || '';
//   const [url, setUrl] = useState(initialUrl);
//   const [currentUrl, setCurrentUrl] = useState(initialUrl);
//   const [inputValue, setInputValue] = useState(initialUrl);
//   const [canGoBack, setCanGoBack] = useState(false);
//   const [canGoForward, setCanGoForward] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showSuggestions, setShowSuggestions] = useState(!initialUrl);

//   const webRef = useRef<WebView>(null);

//   const normalizeUrl = useCallback((text: string): string => {
//     let normalized = text.trim();

//     // If it starts with http:// or https://, use as-is
//     if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
//       return normalized;
//     }

//     // If it looks like a domain, add https://
//     if (normalized.includes('.') && !normalized.includes(' ')) {
//       return `https://${normalized}`;
//     }

//     // Otherwise, search via Google
//     return `https://google.com/search?q=${encodeURIComponent(normalized)}`;
//   }, []);

//   const handleUrlSubmit = useCallback(() => {
//     const normalized = normalizeUrl(inputValue);
//     setUrl(normalized);
//     setShowSuggestions(false);
//   }, [inputValue, normalizeUrl]);

//   const handleQuickShop = useCallback((shopUrl: string) => {
//     setUrl(shopUrl);
//     setInputValue(shopUrl);
//     setShowSuggestions(false);
//   }, []);

//   const onNavStateChange = useCallback((navState: any) => {
//     setCanGoBack(!!navState.canGoBack);
//     setCanGoForward(!!navState.canGoForward);
//     setCurrentUrl(navState.url);
//     setInputValue(navState.url);
//   }, []);

//   const handleBack = useCallback(() => {
//     if (canGoBack && webRef.current) {
//       webRef.current.goBack();
//     } else if (navigate) {
//       navigate('Home');
//     }
//   }, [canGoBack, navigate]);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     headerContent: {
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//     },
//     topBar: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     backButton: {
//       padding: 8,
//       marginRight: 4,
//     },
//     titleAndClose: {
//       flex: 1,
//       marginRight: 8,
//     },
//     title: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '600',
//       marginBottom: 4,
//     },
//     urlDisplay: {
//       color: theme.colors.foreground3,
//       fontSize: 11,
//       maxWidth: '90%',
//     },
//     closeButton: {
//       padding: 8,
//     },
//     urlBar: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       borderRadius: 20,
//       paddingHorizontal: 12,
//       marginBottom: 8,
//       height: 36,
//     },
//     searchIcon: {
//       marginRight: 8,
//     },
//     urlInput: {
//       flex: 1,
//       color: theme.colors.foreground,
//       fontSize: 14,
//       padding: 0,
//     },
//     controlsBar: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     controlButton: {
//       padding: 8,
//       opacity: 0.6,
//     },
//     controlButtonActive: {
//       opacity: 1,
//     },
//     suggestionsContainer: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     suggestionsTitle: {
//       color: theme.colors.foreground2,
//       fontSize: 13,
//       fontWeight: '600',
//       marginHorizontal: 16,
//       marginTop: 16,
//       marginBottom: 12,
//     },
//     shoppingGrid: {
//       paddingHorizontal: 8,
//     },
//     shoppingButton: {
//       alignItems: 'center',
//       justifyContent: 'center',
//       margin: 8,
//       padding: 12,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       minWidth: (screenWidth - 48) / 2,
//     },
//     shoppingButtonText: {
//       color: theme.colors.foreground,
//       fontSize: 13,
//       fontWeight: '500',
//       marginTop: 8,
//       textAlign: 'center',
//     },
//     loaderContainer: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <View style={styles.headerContent}>
//           {/* Top bar with back button and close */}
//           <View style={styles.topBar}>
//             <TouchableOpacity
//               style={[styles.backButton, !canGoBack && {opacity: 0.4}]}
//               onPress={handleBack}
//               disabled={!canGoBack && !navigate}>
//               <MaterialIcons
//                 name="arrow-back-ios"
//                 size={20}
//                 color={theme.colors.primary}
//               />
//             </TouchableOpacity>

//             <View style={styles.titleAndClose}>
//               <Text style={styles.title}>StylHelpr Browser</Text>
//               <Text style={styles.urlDisplay} numberOfLines={1}>
//                 {currentUrl || 'Ready to browse'}
//               </Text>
//             </View>

//             <TouchableOpacity
//               style={styles.closeButton}
//               onPress={() => navigate?.('Home')}>
//               <MaterialIcons
//                 name="close"
//                 size={20}
//                 color={theme.colors.foreground2}
//               />
//             </TouchableOpacity>
//           </View>

//           {/* URL Bar */}
//           <View style={styles.urlBar}>
//             <MaterialIcons
//               name="search"
//               size={18}
//               color={theme.colors.foreground3}
//               style={styles.searchIcon}
//             />
//             <TextInput
//               style={styles.urlInput}
//               placeholder="Search or enter URL"
//               placeholderTextColor={theme.colors.foreground3}
//               value={inputValue}
//               onChangeText={setInputValue}
//               onSubmitEditing={handleUrlSubmit}
//               onFocus={() => setShowSuggestions(!url)}
//               returnKeyType="go"
//               autoCapitalize="none"
//               autoCorrect={false}
//               keyboardType="url"
//             />
//             {inputValue && (
//               <TouchableOpacity onPress={() => setInputValue('')}>
//                 <MaterialIcons
//                   name="clear"
//                   size={16}
//                   color={theme.colors.foreground3}
//                 />
//               </TouchableOpacity>
//             )}
//           </View>

//           {/* Controls Bar */}
//           <View style={styles.controlsBar}>
//             <View style={{flexDirection: 'row'}}>
//               <TouchableOpacity
//                 style={[
//                   styles.controlButton,
//                   canGoBack && styles.controlButtonActive,
//                 ]}
//                 onPress={() => webRef.current?.goBack()}
//                 disabled={!canGoBack}>
//                 <MaterialIcons
//                   name="arrow-back"
//                   size={20}
//                   color={theme.colors.primary}
//                   style={{opacity: canGoBack ? 1 : 0.4}}
//                 />
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[
//                   styles.controlButton,
//                   canGoForward && styles.controlButtonActive,
//                 ]}
//                 onPress={() => webRef.current?.goForward()}
//                 disabled={!canGoForward}>
//                 <MaterialIcons
//                   name="arrow-forward"
//                   size={20}
//                   color={theme.colors.primary}
//                   style={{opacity: canGoForward ? 1 : 0.4}}
//                 />
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={styles.controlButton}
//                 onPress={() => webRef.current?.reload()}>
//                 <MaterialIcons
//                   name="refresh"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity>
//             </View>

//             {isLoading && (
//               <ActivityIndicator color={theme.colors.primary} size="small" />
//             )}
//           </View>
//         </View>
//       </View>

//       {/* WebView or Suggestions */}
//       {!url || showSuggestions ? (
//         <ScrollView style={styles.suggestionsContainer}>
//           <Text style={styles.suggestionsTitle}>Popular Shopping Sites</Text>
//           <View style={[styles.shoppingGrid, {flexDirection: 'row', flexWrap: 'wrap'}]}>
//             {SHOPPING_SITES.map(site => (
//               <TouchableOpacity
//                 key={site.name}
//                 style={styles.shoppingButton}
//                 onPress={() => handleQuickShop(site.url)}>
//                 <MaterialIcons
//                   name={site.icon}
//                   size={24}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.shoppingButtonText}>{site.name}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </ScrollView>
//       ) : (
//         <WebView
//           ref={webRef}
//           source={{uri: url}}
//           style={{flex: 1}}
//           onNavigationStateChange={onNavStateChange}
//           onLoadStart={() => setIsLoading(true)}
//           onLoadEnd={() => setIsLoading(false)}
//           startInLoadingState
//           originWhitelist={['*']}
//           javaScriptEnabled
//           domStorageEnabled
//           renderLoading={() => (
//             <View style={styles.loaderContainer}>
//               <ActivityIndicator
//                 size="large"
//                 color={theme.colors.primary}
//               />
//             </View>
//           )}
//           userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
//         />
//       )}
//     </SafeAreaView>
//   );
// }
