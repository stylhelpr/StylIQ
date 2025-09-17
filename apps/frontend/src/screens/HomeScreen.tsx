// apps/mobile/src/screens/HomeScreen.tsx
import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';

import {fetchWeather} from '../utils/travelWeather';
import {ensureLocationPermission} from '../utils/permissions';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
// removed unused LinearGradient / BlurView
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// removed unused notifyOutfitForTomorrow / PushNotification
import {initializeNotifications} from '../utils/notificationService';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import Video from 'react-native-video';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
// removed unused GlassCard
import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
import {useVoiceControl} from '../hooks/useVoiceControl';
// removed unused TextInput
import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
import {useHomePrefs} from '../hooks/useHomePrefs';

type Props = {
  navigate: (screen: string, params?: any) => void;
  wardrobe: any[];
};

const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
  const scrollY = useRef(new Animated.Value(0)).current;

  const interpolatedBlurAmount = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [10, 2],
    extrapolate: 'clamp',
  });

  const interpolatedShadowOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0.12, 0.03],
    extrapolate: 'clamp',
  });

  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const [weather, setWeather] = useState<any>(null);
  const userId = useUUID();

  const [firstName, setFirstName] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedLook, setSelectedLook] = useState<any | null>(null);

  // 🔧 visibility prefs from Settings
  const {prefs, ready} = useHomePrefs();

  useEffect(() => {
    const fetchFirstName = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/users/${userId}`);
        const data = await res.json();
        setFirstName(data.first_name);
      } catch (err) {
        console.error('❌ Failed to fetch user:', err);
      }
    };

    fetchFirstName();
  }, [userId]);

  useEffect(() => {
    const fetchData = async () => {
      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) return;
      Geolocation.getCurrentPosition(
        async pos => {
          const data = await fetchWeather(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          setWeather(data);
        },
        err => console.warn(err),
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
      );
    };
    fetchData();
  }, []);

  useEffect(() => {
    initializeNotifications();
  }, []);

  // Saved looks
  const [savedLooks, setSavedLooks] = useState<any[]>([]);
  useEffect(() => {
    if (!userId) return;
    const fetchSavedLooks = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch saved looks');
        const data = await res.json();
        console.log('📦 savedLooks data:', data);
        setSavedLooks(data);
      } catch (err) {
        console.error('❌ Failed to fetch saved looks:', err);
      }
    };
    fetchSavedLooks();
  }, [userId]);

  // Voice (kept minimal to avoid unused vars)
  const {speech} = useVoiceControl();
  useEffect(() => {
    if (speech) {
      console.log('[HomeScreen] speech:', speech);
    }
  }, [speech]);

  const styles = StyleSheet.create({
    bannerImage: {
      width: '100%',
      height: 200,
    },
    bannerOverlay: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(0,0,0,0.45)',
      padding: 12,
      borderRadius: tokens.borderRadius.md,
    },
    bannerText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#fff',
    },
    bannerSubtext: {
      fontSize: 13,
      fontWeight: '400',
      color: '#ddd',
      marginTop: 4,
    },
    bodyText: {
      fontSize: 16,
      fontWeight: '400',
      color: theme.colors.foreground,
    },
    subtext: {
      fontSize: 13,
      fontWeight: '400',
      color: '#999',
    },
    dailyLookText: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.foreground3,
      lineHeight: 22,
    },
    tryButton: {
      backgroundColor: theme.colors.button1,
      paddingVertical: 10,
      marginTop: 14,
      alignItems: 'center',
    },
    tryButtonText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#fff',
    },
    quickAccessItem: {
      alignItems: 'center',
      width: '40%',
      minWidth: 140,
      maxWidth: 185,
      margin: 12,
    },
    quickAccessGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: '100%',
    },
    quickAccessButton: {
      backgroundColor: theme.colors.button1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionWeather: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    weatherCity: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
      marginBottom: 4,
    },
    weatherDesc: {
      fontSize: 13,
      color: '#ccc',
    },
    weatherTempContainer: {
      backgroundColor: theme.colors.button1,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: tokens.borderRadius.md,
    },
    weatherTemp: {
      fontSize: 28,
      fontWeight: '800',
      color: '#fff',
    },
    weatherAdvice: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffd369',
      marginTop: 8,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    tagText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });

  // Avoid flicker until prefs are ready
  if (!ready) {
    return <View style={globalStyles.screen} />;
  }

  return (
    <Animated.ScrollView
      style={globalStyles.screen}
      contentContainerStyle={globalStyles.container}
      scrollEventThrottle={16}
      onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
        useNativeDriver: true,
      })}>
      {/* Header Row: Greeting + Menu */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 0,
          marginBottom: 6,
        }}>
        <Text
          style={{
            flex: 1,
            fontSize: 17,
            fontWeight: '800',
            color: '#fff',
            textShadowColor: 'rgba(0,0,0,0.6)',
            textShadowOffset: {width: 0, height: 1},
            textShadowRadius: 2,
          }}
          numberOfLines={1}
          ellipsizeMode="tail">
          {firstName
            ? `Hey ${firstName}, ready to get styled today?`
            : 'Hey there, ready to get styled today?'}
        </Text>

        <AppleTouchFeedback
          onPress={() => navigate('Settings')}
          hapticStyle="impactLight"
          style={{padding: 6, marginLeft: 10}}>
          <Icon name="tune" size={22} color={theme.colors.button3} />
        </AppleTouchFeedback>
      </View>

      {/* Video Banner with ambient parallax */}
      <View style={globalStyles.section}>
        <Animated.View
          style={{
            overflow: 'hidden',
            shadowOffset: {width: 0, height: 6},
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
            borderWidth: 1,
            borderColor: theme.colors.surfaceBorder,
            borderRadius: tokens.borderRadius.md,
            backgroundColor: theme.colors.surface,
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, -10],
                  extrapolate: 'clamp',
                }),
              },
            ],
          }}>
          <Video
            source={require('../assets/images/free4.mp4')}
            style={{
              width: '100%',
              height: 200,
            }}
            muted
            repeat
            resizeMode="cover"
            rate={1.0}
            ignoreSilentSwitch="obey"
          />
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              right: 16,
              backgroundColor: 'rgba(0,0,0,0.45)',
              padding: 12,
              borderRadius: 16,
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, 100],
                    outputRange: [0, -4],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}>
            <Animatable.Text
              animation="fadeInDown"
              delay={200}
              style={styles.bannerText}>
              Discover Your Signature Look
            </Animatable.Text>
            <Animatable.Text
              animation="fadeIn"
              delay={400}
              style={styles.bannerSubtext}>
              Curated just for you this season.
            </Animatable.Text>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Weather Section */}
      {prefs.weather && (
        <View style={globalStyles.section}>
          <Text style={globalStyles.sectionTitle}>Weather</Text>
          {weather && (
            <View style={globalStyles.cardStyles1}>
              <Animatable.View
                animation="fadeInUp"
                duration={600}
                delay={100}
                useNativeDriver
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <View style={{flex: 1}}>
                  <Text style={styles.weatherCity}>{weather.celsius.name}</Text>
                  <Text style={styles.weatherDesc}>
                    {weather.celsius.weather[0].description}
                  </Text>
                  <Text style={styles.weatherAdvice}>
                    🌤️{' '}
                    {weather.fahrenheit.main.temp < 50
                      ? 'It’s chilly — layer up.'
                      : weather.fahrenheit.main.temp > 85
                      ? 'Hot day — keep it light.'
                      : 'Perfect weather — dress freely.'}
                  </Text>
                </View>
                <View style={styles.weatherTempContainer}>
                  <Text style={styles.weatherTemp}>
                    {Math.round(weather.fahrenheit.main.temp)}° F
                  </Text>
                </View>
              </Animatable.View>
            </View>
          )}
        </View>
      )}

      {/* ✅ Smart AI Nudge (only when weather is on) */}
      {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
        <Animatable.View
          animation="fadeInUp"
          delay={300}
          duration={800}
          useNativeDriver
          style={{
            marginHorizontal: 16,
            marginBottom: 20,
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 3,
          }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: '#ffd369',
              fontStyle: 'italic',
            }}>
            🧥 It might rain later — consider a jacket with your look.
          </Text>
        </Animatable.View>
      )}

      {/* Map Section */}
      {prefs.locationMap && (
        <View style={globalStyles.section}>
          <Text style={globalStyles.sectionTitle}>Your Location</Text>
          <View style={[globalStyles.cardStyles1, {padding: 0}]}>
            <LiveLocationMap
              height={220}
              useCustomPin={false}
              postHeartbeat={false}
            />
          </View>
        </View>
      )}

      {/* /// QUICK ACCESS SECTION /// */}
      {prefs.quickAccess && (
        <View style={globalStyles.centeredSection}>
          <View style={globalStyles.section}>
            <Text style={globalStyles.sectionTitle}>Quick Access</Text>
            <View style={[globalStyles.centeredSection]}>
              <View
                style={[
                  globalStyles.cardStyles1,
                  {
                    padding: 10,
                    justifyContent: 'center',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    width: '100%',
                  },
                ]}>
                {[
                  {label: 'Ai Chat', screen: 'AiStylistChatScreen'},
                  {label: 'Style Me', screen: 'Outfit'},
                  {label: 'Wardrobe', screen: 'Wardrobe'},
                  {label: 'Add Clothes', screen: 'AddItem'},
                  {label: 'Fashion News', screen: 'Explore'},
                  {label: 'Profile', screen: 'Profile'},
                ].map(btn => (
                  <View key={btn.screen} style={styles.quickAccessItem}>
                    <AppleTouchFeedback
                      style={[globalStyles.buttonPrimary, {width: 160}]}
                      hapticStyle="impactHeavy"
                      onPress={() => navigate(btn.screen)}>
                      <Text style={globalStyles.buttonPrimaryText}>
                        {btn.label}
                      </Text>
                    </AppleTouchFeedback>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* // 2) Saved Looks */}
      {prefs.savedLooks && (
        <View style={globalStyles.sectionScroll}>
          <Text style={globalStyles.sectionTitle}>Saved Looks</Text>
          {savedLooks.length === 0 ? (
            <Text style={{color: '#aaa', paddingLeft: 16, fontStyle: 'italic'}}>
              You haven’t saved any outfits yet. Tap the heart on your favorite
              looks!
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingRight: 8}}>
              {savedLooks.map((look, index) => (
                <Animatable.View
                  key={look.id}
                  animation="fadeInUp"
                  delay={index * 120}
                  useNativeDriver
                  style={globalStyles.outfitCard}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedLook(look);
                      setPreviewVisible(true);
                    }}
                    style={{alignItems: 'center'}}>
                    <Image
                      source={{uri: look.image_url}}
                      style={globalStyles.image4}
                      resizeMode="cover"
                    />
                    <Text
                      style={[globalStyles.label, {marginTop: 6}]}
                      numberOfLines={1}>
                      {look.name}
                    </Text>
                  </TouchableOpacity>
                </Animatable.View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Add Look CTA only if Saved Looks is on */}
      {prefs.savedLooks && (
        <View style={{alignItems: 'center'}}>
          <AppleTouchFeedback
            style={[globalStyles.buttonPrimary, {width: 160}]}
            hapticStyle="impactHeavy"
            onPress={() => setSaveModalVisible(true)}>
            <Text style={globalStyles.buttonPrimaryText}>Add A Look</Text>
          </AppleTouchFeedback>
        </View>
      )}

      <SaveLookModal
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
      />

      <SavedLookPreviewModal
        visible={previewVisible}
        look={selectedLook}
        onClose={() => setPreviewVisible(false)}
      />
    </Animated.ScrollView>
  );
};

export default HomeScreen;

/////////////////////

// // apps/mobile/src/screens/HomeScreen.tsx
// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';

// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// // removed unused LinearGradient / BlurView
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// // removed unused notifyOutfitForTomorrow / PushNotification
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// // removed unused GlassCard
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// // removed unused TextInput
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   const interpolatedBlurAmount = scrollY.interpolate({
//     inputRange: [0, 100],
//     outputRange: [10, 2],
//     extrapolate: 'clamp',
//   });

//   const interpolatedShadowOpacity = scrollY.interpolate({
//     inputRange: [0, 100],
//     outputRange: [0.12, 0.03],
//     extrapolate: 'clamp',
//   });

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);

//   // 🔧 visibility prefs from Settings
//   const {prefs, ready} = useHomePrefs();

//   useEffect(() => {
//     const fetchFirstName = async () => {
//       if (!userId) return;
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         const data = await res.json();
//         setFirstName(data.first_name);
//       } catch (err) {
//         console.error('❌ Failed to fetch user:', err);
//       }
//     };

//     fetchFirstName();
//   }, [userId]);

//   useEffect(() => {
//     const fetchData = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return;
//       Geolocation.getCurrentPosition(
//         async pos => {
//           const data = await fetchWeather(
//             pos.coords.latitude,
//             pos.coords.longitude,
//           );
//           setWeather(data);
//         },
//         err => console.warn(err),
//         {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
//       );
//     };
//     fetchData();
//   }, []);

//   useEffect(() => {
//     initializeNotifications();
//   }, []);

//   // Saved looks
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         console.log('📦 savedLooks data:', data);
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   // Voice (kept minimal to avoid unused vars)
//   const {speech} = useVoiceControl();
//   useEffect(() => {
//     if (speech) {
//       console.log('[HomeScreen] speech:', speech);
//     }
//   }, [speech]);

//   const styles = StyleSheet.create({
//     bannerImage: {
//       width: '100%',
//       height: 200,
//     },
//     bannerOverlay: {
//       position: 'absolute',
//       bottom: 16,
//       left: 16,
//       right: 16,
//       backgroundColor: 'rgba(0,0,0,0.45)',
//       padding: 12,
//       borderRadius: tokens.borderRadius.md,
//     },
//     bannerText: {
//       fontSize: 17,
//       fontWeight: '600',
//       color: '#fff',
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: '#ddd',
//       marginTop: 4,
//     },
//     bodyText: {
//       fontSize: 16,
//       fontWeight: '400',
//       color: theme.colors.foreground,
//     },
//     subtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: '#999',
//     },
//     dailyLookText: {
//       fontSize: 14,
//       fontWeight: '400',
//       color: theme.colors.foreground3,
//       lineHeight: 22,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 10,
//       marginTop: 14,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       fontSize: 17,
//       fontWeight: '600',
//       color: '#fff',
//     },
//     quickAccessItem: {
//       alignItems: 'center',
//       width: '40%',
//       minWidth: 140,
//       maxWidth: 185,
//       margin: 12,
//     },
//     quickAccessGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       width: '100%',
//     },
//     quickAccessButton: {
//       backgroundColor: theme.colors.button1,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     sectionWeather: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     weatherCity: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#fff',
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: '#ccc',
//     },
//     weatherTempContainer: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 6,
//       paddingHorizontal: 14,
//       borderRadius: tokens.borderRadius.md,
//     },
//     weatherTemp: {
//       fontSize: 28,
//       fontWeight: '800',
//       color: '#fff',
//     },
//     weatherAdvice: {
//       fontSize: 14,
//       fontWeight: '600',
//       color: '#ffd369',
//       marginTop: 8,
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     tagText: {
//       fontSize: 13,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//   });

//   // Avoid flicker until prefs are ready
//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={globalStyles.screen}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header shortcut to Settings → Customize Home */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'flex-end',
//           paddingHorizontal: 12,
//           paddingTop: 6,
//         }}>
//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6}}>
//           <Icon name="tune" size={22} color={theme.colors.button3} />
//         </AppleTouchFeedback>
//       </View>

//       {/* Greeting */}
//       <Animated.View
//         style={{
//           transform: [
//             {
//               translateY: scrollY.interpolate({
//                 inputRange: [0, 100],
//                 outputRange: [0, -10],
//                 extrapolate: 'clamp',
//               }),
//             },
//           ],
//           marginBottom: 16,
//           marginHorizontal: 16,
//           borderRadius: 20,
//           overflow: 'hidden',
//         }}>
//         <View style={{alignItems: 'center'}}>
//           <Text
//             style={{
//               fontSize: 17,
//               fontWeight: '800',
//               color: '#fff',
//               textAlign: 'center',
//               textShadowColor: 'rgba(0,0,0,0.6)',
//               textShadowOffset: {width: 0, height: 1},
//               textShadowRadius: 2,
//             }}>
//             {firstName
//               ? `Hey ${firstName}, ready to get styled today?`
//               : 'Hey there, ready to get styled today?'}
//           </Text>
//         </View>
//       </Animated.View>

//       {/* Video Banner with ambient parallax */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: 1,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.md,
//             backgroundColor: theme.colors.surface,
//             transform: [
//               {
//                 translateY: scrollY.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: [0, -10],
//                   extrapolate: 'clamp',
//                 }),
//               },
//             ],
//           }}>
//           <Video
//             source={require('../assets/images/free4.mp4')}
//             style={{
//               width: '100%',
//               height: 200,
//             }}
//             muted
//             repeat
//             resizeMode="cover"
//             rate={1.0}
//             ignoreSilentSwitch="obey"
//           />
//           <Animated.View
//             style={{
//               position: 'absolute',
//               bottom: 10,
//               left: 10,
//               right: 16,
//               backgroundColor: 'rgba(0,0,0,0.45)',
//               padding: 12,
//               borderRadius: 16,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -4],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Animatable.Text
//               animation="fadeInDown"
//               delay={200}
//               style={styles.bannerText}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={styles.bannerSubtext}>
//               Curated just for you this season.
//             </Animatable.Text>
//           </Animated.View>
//         </Animated.View>
//       </View>

//       {/* Weather Section */}
//       {prefs.weather && (
//         <View style={globalStyles.section}>
//           <Text style={globalStyles.sectionTitle}>Weather</Text>
//           {weather && (
//             <View style={globalStyles.cardStyles1}>
//               <Animatable.View
//                 animation="fadeInUp"
//                 duration={600}
//                 delay={100}
//                 useNativeDriver
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   justifyContent: 'space-between',
//                 }}>
//                 <View style={{flex: 1}}>
//                   <Text style={styles.weatherCity}>{weather.celsius.name}</Text>
//                   <Text style={styles.weatherDesc}>
//                     {weather.celsius.weather[0].description}
//                   </Text>
//                   <Text style={styles.weatherAdvice}>
//                     🌤️{' '}
//                     {weather.fahrenheit.main.temp < 50
//                       ? 'It’s chilly — layer up.'
//                       : weather.fahrenheit.main.temp > 85
//                       ? 'Hot day — keep it light.'
//                       : 'Perfect weather — dress freely.'}
//                   </Text>
//                 </View>
//                 <View style={styles.weatherTempContainer}>
//                   <Text style={styles.weatherTemp}>
//                     {Math.round(weather.fahrenheit.main.temp)}° F
//                   </Text>
//                 </View>
//               </Animatable.View>
//             </View>
//           )}
//         </View>
//       )}

//       {/* ✅ Smart AI Nudge (only when weather is on) */}
//       {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={800}
//           useNativeDriver
//           style={{
//             marginHorizontal: 16,
//             marginBottom: 20,
//             backgroundColor: theme.colors.surface,
//             borderRadius: 16,
//             padding: 16,
//             shadowColor: '#000',
//             shadowOpacity: 0.08,
//             shadowRadius: 6,
//             elevation: 3,
//           }}>
//           <Text
//             style={{
//               fontSize: 15,
//               fontWeight: '600',
//               color: '#ffd369',
//               fontStyle: 'italic',
//             }}>
//             🧥 It might rain later — consider a jacket with your look.
//           </Text>
//         </Animatable.View>
//       )}

//       {/* Map Section */}
//       {prefs.locationMap && (
//         <View style={globalStyles.section}>
//           <Text style={globalStyles.sectionTitle}>Your Location</Text>
//           <View style={[globalStyles.cardStyles1, {padding: 0}]}>
//             <LiveLocationMap
//               height={220}
//               useCustomPin={false}
//               postHeartbeat={false}
//             />
//           </View>
//         </View>
//       )}

//       {/* /// QUICK ACCESS SECTION /// */}
//       {prefs.quickAccess && (
//         <View style={globalStyles.centeredSection}>
//           <View style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//             <View style={[globalStyles.centeredSection]}>
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     padding: 10,
//                     justifyContent: 'center',
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     width: '100%',
//                   },
//                 ]}>
//                 {[
//                   {label: 'Ai Chat', screen: 'AiStylistChatScreen'},
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   {label: 'Fashion News', screen: 'Explore'},
//                   {label: 'Profile', screen: 'Profile'},
//                 ].map(btn => (
//                   <View key={btn.screen} style={styles.quickAccessItem}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary, {width: 160}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => navigate(btn.screen)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         {btn.label}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </View>
//       )}

//       {/* // 2) Saved Looks */}
//       {prefs.savedLooks && (
//         <View style={globalStyles.sectionScroll}>
//           <Text style={globalStyles.sectionTitle}>Saved Looks</Text>
//           {savedLooks.length === 0 ? (
//             <Text style={{color: '#aaa', paddingLeft: 16, fontStyle: 'italic'}}>
//               You haven’t saved any outfits yet. Tap the heart on your favorite
//               looks!
//             </Text>
//           ) : (
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={{paddingRight: 8}}>
//               {savedLooks.map((look, index) => (
//                 <Animatable.View
//                   key={look.id}
//                   animation="fadeInUp"
//                   delay={index * 120}
//                   useNativeDriver
//                   style={globalStyles.outfitCard}>
//                   <TouchableOpacity
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <Image
//                       source={{uri: look.image_url}}
//                       style={globalStyles.image4}
//                       resizeMode="cover"
//                     />
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </TouchableOpacity>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           )}
//         </View>
//       )}

//       {/* Add Look CTA only if Saved Looks is on */}
//       {prefs.savedLooks && (
//         <View style={{alignItems: 'center'}}>
//           <AppleTouchFeedback
//             style={[globalStyles.buttonPrimary, {width: 160}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add A Look</Text>
//           </AppleTouchFeedback>
//         </View>
//       )}

//       <SaveLookModal
//         visible={saveModalVisible}
//         onClose={() => setSaveModalVisible(false)}
//       />

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;
