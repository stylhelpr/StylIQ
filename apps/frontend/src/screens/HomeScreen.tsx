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
import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
import {fetchWeather} from '../utils/travelWeather';
import {ensureLocationPermission} from '../utils/permissions';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
import {initializeNotifications} from '../utils/notificationService';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import Video from 'react-native-video';

type Props = {
  navigate: (screen: string, params?: any) => void;
  wardrobe: any[];
};

const profileImages = [
  {
    id: '1',
    uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '2',
    uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '3',
    uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '4',
    uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '5',
    uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '6',
    uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
];

const savedLooksPreview = [
  {
    id: 'look1',
    name: 'Monochrome Layers',
    image:
      'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look2',
    name: 'Tailored Casual',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look3',
    name: 'Gallery Ready',
    image:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look4',
    name: 'Warm Textures',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look5',
    name: 'Sharp Street',
    image:
      'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
];

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
  const [weather, setWeather] = useState(null);
  const userId = useUUID();

  const [firstName, setFirstName] = useState('');

  const LOCAL_IP = '192.168.0.106';
  const PORT = 3001;
  const BASE_URL = `${API_BASE_URL}/wardrobe`;

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

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      paddingTop: 24,
      paddingBottom: 60,
      paddingHorizontal: 16,
    },
    section: {
      marginBottom: 20,
    },
    bannerImage: {
      width: '100%',
      height: 200,
      borderRadius: 20,
    },
    bannerOverlay: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(0,0,0,0.45)',
      padding: 12,
      borderRadius: 16,
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
    dailyLookText: {
      fontSize: 15,
      fontWeight: '400',
      color: theme.colors.foreground,
      lineHeight: 22,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 24,
      color: theme.colors.foreground,
      paddingBottom: 12,
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
    dailyLookCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    tryButton: {
      backgroundColor: theme.colors.button1,
      paddingVertical: 10,
      borderRadius: 14,
      marginTop: 14,
      alignItems: 'center',
    },
    tryButtonText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#fff',
    },
    tileRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    tile: {
      width: 186,
      backgroundColor: theme.colors.button1,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      marginBottom: 10,
    },
    tileText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    outfitCard: {
      width: 90,
      marginRight: 12,
      alignItems: 'center',
    },
    outfitImage: {
      width: 90,
      height: 90,
      borderRadius: 12,
      backgroundColor: '#eee',
    },
    outfitLabel: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '400',
      color: theme.colors.foreground,
      textAlign: 'center',
      maxWidth: 90,
    },
    sectionWeather: {
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    weatherCity: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
      marginBottom: 2,
    },
    weatherDesc: {
      fontSize: 13,
      color: '#ccc',
    },
    weatherTempContainer: {
      backgroundColor: theme.colors.button1,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    weatherTemp: {
      fontSize: 28,
      fontWeight: '800',
      color: '#fff',
    },
    weatherAdvice: {
      fontSize: 14,
      fontWeight: '600',
      fontStyle: 'italic',
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

  // Define your nudge logic
  const SmartNudge = ({theme}) => (
    <Animatable.View
      animation="fadeIn"
      delay={1000}
      duration={800}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 14,
        marginTop: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
      }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: theme.colors.primary,
          fontStyle: 'italic',
        }}>
        🧠 It might rain later — consider a jacket with your look.
      </Text>
    </Animatable.View>
  );

  return (
    <Animated.ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      scrollEventThrottle={16}
      onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
        useNativeDriver: true,
      })}>
      {/* Greeting */}
      <Animated.View
        style={{
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [0, -10],
                extrapolate: 'clamp',
              }),
            },
          ],
          marginBottom: 16,
          marginHorizontal: 16,
          borderRadius: 20,
          overflow: 'hidden',
        }}>
        <View style={{padding: 16, alignItems: 'center'}}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '800',
              color: '#fff',
              textAlign: 'center',
              textShadowColor: 'rgba(0,0,0,0.6)',
              textShadowOffset: {width: 0, height: 1},
              textShadowRadius: 2,
            }}>
            {firstName
              ? `Hey ${firstName}, ready to get styled today?`
              : 'Hey there, ready to get styled today?'}
          </Text>
        </View>
      </Animated.View>

      {/* Video Banner with ambient parallax */}
      <Animated.View
        style={{
          position: 'relative',
          marginBottom: 20,
          borderRadius: 15,
          overflow: 'hidden',
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [0, -10],
                extrapolate: 'clamp',
              }),
            },
          ],
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 6},
          shadowOpacity: interpolatedShadowOpacity,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <Video
          source={require('../assets/images/free4.mp4')}
          style={{width: '100%', height: 200}}
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

      {/* Weather Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weather</Text>
        {weather && (
          <Animatable.View
            animation="fadeInUp"
            duration={600}
            delay={100}
            useNativeDriver
            style={styles.sectionWeather}>
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
        )}
      </View>

      {/* ✅ Smart AI Nudge */}
      {weather?.fahrenheit?.main?.temp < 55 && (
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

      <View style={styles.section}>
        {/* <Text style={styles.aiTitle}>Ask AI Concierge</Text> */}
        <VoiceControlComponent
          onPromptResult={prompt => navigate('Outfit', {prompt})}
        />
      </View>

      <Animatable.View
        animation="fadeInUp"
        delay={300}
        duration={800}
        useNativeDriver
        style={styles.section}>
        <Animated.Text
          style={[
            styles.sectionTitle,
            {
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, 60],
                    outputRange: [0, -3],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}>
          Editorial Look
        </Animated.Text>
        <Animatable.View
          animation="zoomIn"
          delay={400}
          duration={600}
          useNativeDriver
          style={styles.dailyLookCard}>
          <Text style={styles.dailyLookText}>
            Cream knit sweater layered over a sharp-collar shirt. Black tailored
            trousers. Chelsea boots. Effortlessly sharp.
          </Text>

          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            duration={2600}
            style={{
              alignSelf: 'center',
              width: '100%',
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, 60],
                    outputRange: [0, -4],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}>
            <AppleTouchFeedback
              hapticStyle="impactHeavy"
              onPress={() => navigate('Outfit', {look: 'editorial'})}>
              <View style={styles.tryButton}>
                <Text style={styles.tryButtonText}>Try This Look</Text>
              </View>
            </AppleTouchFeedback>
          </Animatable.View>
        </Animatable.View>
      </Animatable.View>

      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.tileRow}>
        <AppleTouchFeedback
          style={styles.tile}
          hapticStyle="impactHeavy"
          onPress={() => navigate('Wardrobe')}>
          <Text style={styles.tileText} numberOfLines={1}>
            Wardrobe
          </Text>
        </AppleTouchFeedback>

        <AppleTouchFeedback
          style={styles.tile}
          hapticStyle="impactHeavy"
          onPress={() => navigate('AddItem')}>
          <Text style={styles.tileText} numberOfLines={1}>
            Add Item
          </Text>
        </AppleTouchFeedback>

        <AppleTouchFeedback
          style={styles.tile}
          hapticStyle="impactHeavy"
          onPress={() => navigate('Outfit')}>
          <Text style={styles.tileText} numberOfLines={1}>
            Style Me
          </Text>
        </AppleTouchFeedback>

        <AppleTouchFeedback
          style={styles.tile}
          hapticStyle="impactHeavy"
          onPress={() => navigate('TryOnOverlay')}>
          <Text style={styles.tileText} numberOfLines={1}>
            Try-On
          </Text>
        </AppleTouchFeedback>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended Outfit</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
          {wardrobe.slice(0, 5).map((item, idx) => (
            <Animatable.View
              animation="fadeInUp"
              delay={100 * idx}
              duration={500}
              useNativeDriver
              key={item.id || idx}
              style={styles.outfitCard}>
              <Image
                source={{uri: item.image}}
                style={styles.outfitImage}
                resizeMode="cover"
              />
              <Text style={styles.outfitLabel} numberOfLines={1}>
                {item.name}
              </Text>
            </Animatable.View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Looks</Text>
        {savedLooksPreview.length === 0 ? (
          <Text style={{color: '#aaa', paddingLeft: 16, fontStyle: 'italic'}}>
            You haven’t saved any outfits yet. Tap the heart on your favorite
            looks!
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
            {savedLooksPreview.slice(0, 5).map((look, index) => (
              <Animatable.View
                key={look.id}
                animation="fadeInUp"
                delay={index * 120}
                useNativeDriver
                style={styles.outfitCard}>
                <TouchableOpacity
                  onPress={() => navigate('SavedOutfits')}
                  style={{alignItems: 'center'}}>
                  <Image
                    source={{uri: look.image}}
                    style={styles.outfitImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.outfitLabel} numberOfLines={1}>
                    {look.name}
                  </Text>
                </TouchableOpacity>
              </Animatable.View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <TouchableOpacity
          style={{
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={async () => {
            const enabled = await AsyncStorage.getItem('notificationsEnabled');
            if (enabled === 'true') {
              PushNotification.localNotification({
                channelId: 'style-channel',
                title: '📣 Test Notification',
                message: 'This is a test style reminder!',
                playSound: true,
                soundName: 'default',
                importance: 4,
                vibrate: true,
              });
            } else {
              console.log('🔕 Notifications are disabled');
            }
          }}>
          <View
            style={{
              backgroundColor: theme.colors.button1,
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}>
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: 16,
                fontWeight: '600',
              }}>
              Send Notification
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.ScrollView>
  );
};

export default HomeScreen;

//////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import LinearGradient from 'react-native-linear-gradient';
// import {BlurView} from '@react-native-community/blur';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// // import {Animated} from 'react-native';

// // const scrollY = useRef(new Animated.Value(0)).current;

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const profileImages = [
//   {
//     id: '1',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '2',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '3',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '4',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '5',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '6',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
// ];

// const savedLooksPreview = [
//   {
//     id: 'look1',
//     name: 'Monochrome Layers',
//     image:
//       'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look2',
//     name: 'Tailored Casual',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look3',
//     name: 'Gallery Ready',
//     image:
//       'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look4',
//     name: 'Warm Textures',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look5',
//     name: 'Sharp Street',
//     image:
//       'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
// ];

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();
//   const [weather, setWeather] = useState(null);
//   const userId = useUUID();

//   const [firstName, setFirstName] = useState('');

//   const LOCAL_IP = '192.168.0.106';
//   const PORT = 3001;
//   const BASE_URL = `${API_BASE_URL}/wardrobe`;

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

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     container: {
//       paddingTop: 24,
//       paddingBottom: 60,
//       paddingHorizontal: 16,
//     },
//     section: {
//       marginBottom: 20,
//     },
//     bannerImage: {
//       width: '100%',
//       height: 200,
//       borderRadius: 20,
//     },
//     bannerOverlay: {
//       position: 'absolute',
//       bottom: 16,
//       left: 16,
//       right: 16,
//       backgroundColor: 'rgba(0,0,0,0.45)',
//       padding: 12,
//       borderRadius: 16,
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
//     dailyLookText: {
//       fontSize: 15,
//       fontWeight: '400',
//       color: theme.colors.foreground,
//       lineHeight: 22,
//     },
//     sectionTitle: {
//       fontSize: 17,
//       fontWeight: '600',
//       lineHeight: 24,
//       color: theme.colors.foreground,
//       paddingBottom: 12,
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
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 4},
//       shadowOpacity: 0.08,
//       shadowRadius: 8,
//       elevation: 3,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 10,
//       borderRadius: 14,
//       marginTop: 14,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       fontSize: 17,
//       fontWeight: '600',
//       color: '#fff',
//     },
//     tileRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       marginBottom: 10,
//     },
//     tile: {
//       width: 186,
//       backgroundColor: theme.colors.button1,
//       borderRadius: 14,
//       paddingVertical: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.1,
//       shadowRadius: 4,
//       elevation: 2,
//       marginBottom: 10,
//     },
//     tileText: {
//       fontSize: 15,
//       fontWeight: '600',
//       color: '#fff',
//     },
//     outfitCard: {
//       width: 90,
//       marginRight: 12,
//       alignItems: 'center',
//     },
//     outfitImage: {
//       width: 90,
//       height: 90,
//       borderRadius: 12,
//       backgroundColor: '#eee',
//     },
//     outfitLabel: {
//       marginTop: 6,
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       maxWidth: 90,
//     },
//     sectionWeather: {
//       borderRadius: 20,
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 10,
//       elevation: 3,
//     },
//     weatherCity: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#fff',
//       marginBottom: 2,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: '#ccc',
//     },
//     weatherTempContainer: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 6,
//       paddingHorizontal: 14,
//       borderRadius: 12,
//     },
//     weatherTemp: {
//       fontSize: 28,
//       fontWeight: '800',
//       color: '#fff',
//     },
//     weatherAdvice: {
//       fontSize: 14,
//       fontWeight: '600',
//       fontStyle: 'italic',
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

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       <Animatable.View
//         animation="fadeInDown"
//         delay={100}
//         duration={700}
//         useNativeDriver
//         style={{
//           marginBottom: 16,
//           marginHorizontal: 16,
//           borderRadius: 20,
//           overflow: 'hidden',
//           // 🚫 no background, no blur
//         }}>
//         <View style={{padding: 16, alignItems: 'center'}}>
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
//       </Animatable.View>

//       <View
//         style={{
//           position: 'relative',
//           marginBottom: 20,
//           borderRadius: 15,
//           overflow: 'hidden',
//         }}>
//         <Video
//           source={require('../assets/images/free4.mp4')}
//           style={{width: '100%', height: 200}}
//           muted
//           repeat
//           resizeMode="cover"
//           rate={0.8}
//           ignoreSilentSwitch="obey"
//         />

//         <BlurView
//           style={{
//             position: 'absolute',
//             bottom: 10,
//             left: 10,
//             right: 16,
//             backgroundColor: 'rgba(0,0,0,0.45)',
//             padding: 12,
//             borderRadius: 16,
//           }}
//           blurType="light"
//           blurAmount={10}
//           reducedTransparencyFallbackColor="rgba(255,255,255,0.2)">
//           <Animatable.Text
//             animation="fadeInDown"
//             delay={200}
//             style={styles.bannerText}>
//             Discover Your Signature Look
//           </Animatable.Text>
//           <Animatable.Text
//             animation="fadeIn"
//             delay={400}
//             style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Animatable.Text>
//         </BlurView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Weather</Text>
//         {weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={600}
//             delay={100}
//             useNativeDriver
//             style={styles.sectionWeather}>
//             <View style={{flex: 1}}>
//               <Text style={styles.weatherCity}>{weather.celsius.name}</Text>
//               <Text style={styles.weatherDesc}>
//                 {weather.celsius.weather[0].description}
//               </Text>
//               <Text style={styles.weatherAdvice}>
//                 🌤️{' '}
//                 {weather.fahrenheit.main.temp < 50
//                   ? 'It’s chilly — layer up.'
//                   : weather.fahrenheit.main.temp > 85
//                   ? 'Hot day — keep it light.'
//                   : 'Perfect weather — dress freely.'}
//               </Text>
//             </View>
//             <View style={styles.weatherTempContainer}>
//               <Text style={styles.weatherTemp}>
//                 {Math.round(weather.fahrenheit.main.temp)}° F
//               </Text>
//             </View>
//           </Animatable.View>
//         )}
//       </View>

//       <View style={styles.section}>
//         {/* <Text style={styles.aiTitle}>Ask AI Concierge</Text> */}
//         <VoiceControlComponent
//           onPromptResult={prompt => navigate('Outfit', {prompt})}
//         />
//       </View>

//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         duration={800}
//         useNativeDriver
//         style={styles.section}>
//         <Text style={styles.sectionTitle}>Editorial Look</Text>

//         <Animatable.View
//           animation="zoomIn"
//           delay={400}
//           duration={600}
//           useNativeDriver
//           style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>

//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={2600}
//             style={{alignSelf: 'center', width: '100%'}}>
//             <AppleTouchFeedback
//               hapticStyle="impactHeavy"
//               onPress={() => navigate('Outfit', {look: 'editorial'})}>
//               <View style={styles.tryButton}>
//                 <Text style={styles.tryButtonText}>Try This Look</Text>
//               </View>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         </Animatable.View>
//       </Animatable.View>

//       <Text style={styles.sectionTitle}>Quick Access</Text>
//       <View style={styles.tileRow}>
//         <AppleTouchFeedback
//           style={styles.tile}
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('Wardrobe')}>
//           <Text style={styles.tileText} numberOfLines={1}>
//             Wardrobe
//           </Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.tile}
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('AddItem')}>
//           <Text style={styles.tileText} numberOfLines={1}>
//             Add Item
//           </Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.tile}
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('Outfit')}>
//           <Text style={styles.tileText} numberOfLines={1}>
//             Style Me
//           </Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.tile}
//           hapticStyle="impactHeavy"
//           onPress={() => navigate('TryOnOverlay')}>
//           <Text style={styles.tileText} numberOfLines={1}>
//             Try-On
//           </Text>
//         </AppleTouchFeedback>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Recommended Outfit</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//           {wardrobe.slice(0, 5).map((item, idx) => (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={100 * idx}
//               duration={500}
//               useNativeDriver
//               key={item.id || idx}
//               style={styles.outfitCard}>
//               <Image
//                 source={{uri: item.image}}
//                 style={styles.outfitImage}
//                 resizeMode="cover"
//               />
//               <Text style={styles.outfitLabel} numberOfLines={1}>
//                 {item.name}
//               </Text>
//             </Animatable.View>
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Saved Looks</Text>
//         {savedLooksPreview.length === 0 ? (
//           <Text style={{color: '#aaa', paddingLeft: 16, fontStyle: 'italic'}}>
//             You haven’t saved any outfits yet. Tap the heart on your favorite
//             looks!
//           </Text>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//             {savedLooksPreview.slice(0, 5).map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="fadeInUp"
//                 delay={index * 120}
//                 useNativeDriver
//                 style={styles.outfitCard}>
//                 <TouchableOpacity
//                   onPress={() => navigate('SavedOutfits')}
//                   style={{alignItems: 'center'}}>
//                   <Image
//                     source={{uri: look.image}}
//                     style={styles.outfitImage}
//                     resizeMode="cover"
//                   />
//                   <Text style={styles.outfitLabel} numberOfLines={1}>
//                     {look.name}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Notifications</Text>
//         <TouchableOpacity
//           style={{
//             padding: 12,
//             borderRadius: 8,
//             alignItems: 'center',
//           }}
//           onPress={async () => {
//             const enabled = await AsyncStorage.getItem('notificationsEnabled');
//             if (enabled === 'true') {
//               PushNotification.localNotification({
//                 channelId: 'style-channel',
//                 title: '📣 Test Notification',
//                 message: 'This is a test style reminder!',
//                 playSound: true,
//                 soundName: 'default',
//                 importance: 4,
//                 vibrate: true,
//               });
//             } else {
//               console.log('🔕 Notifications are disabled');
//             }
//           }}>
//           <View
//             style={{
//               backgroundColor: theme.colors.button1,
//               padding: 12,
//               borderRadius: 8,
//               alignItems: 'center',
//             }}>
//             <Text
//               style={{
//                 color: theme.colors.primary,
//                 fontSize: 16,
//                 fontWeight: '600',
//               }}>
//               Send Notification
//             </Text>
//           </View>
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;
