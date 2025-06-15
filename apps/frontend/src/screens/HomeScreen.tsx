import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
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
      marginBottom: 14,
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
      backgroundColor: '#007AFF',
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
      backgroundColor: '#007AFF',
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
      backgroundColor: '#007AFF',
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={{paddingHorizontal: 16, marginBottom: 8}}>
        <Text
          style={{
            fontSize: 18,
            color: theme.colors.foreground,
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: 4,
          }}>
          {firstName
            ? `Hey ${firstName}, ready to get styled today?`
            : 'Hey there, ready to get styled today?'}
        </Text>
      </View>
      <View style={{position: 'relative', marginBottom: 20}}>
        <Image
          source={require('../assets/images/free1.jpg')}
          style={styles.bannerImage}
        />
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerText}>Discover Your Signature Look</Text>
          <Text style={styles.bannerSubtext}>
            Curated just for you this season.
          </Text>
        </View>
      </View>

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

      <View style={styles.section}>
        {/* <Text style={styles.aiTitle}>Ask AI Concierge</Text> */}
        <VoiceControlComponent
          onPromptResult={prompt => navigate('Outfit', {prompt})}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Editorial Look</Text>
        <View style={styles.dailyLookCard}>
          <Text style={styles.dailyLookText}>
            Cream knit sweater layered over a sharp-collar shirt. Black tailored
            trousers. Chelsea boots. Effortlessly sharp.
          </Text>

          <AppleTouchFeedback
            hapticStyle="impactHeavy"
            onPress={() => navigate('Outfit', {look: 'editorial'})}>
            <View style={styles.tryButton}>
              <Text style={styles.tryButtonText}>Try This Look</Text>
            </View>
          </AppleTouchFeedback>
        </View>
      </View>

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
            <View key={idx} style={styles.outfitCard}>
              <Image
                source={{uri: item.image}}
                style={styles.outfitImage}
                resizeMode="cover"
              />
              <Text style={styles.outfitLabel} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
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
              <TouchableOpacity
                key={look.id}
                onPress={() => navigate('SavedOutfits')}
                style={styles.outfitCard}>
                <Image
                  source={{uri: look.image}}
                  style={styles.outfitImage}
                  resizeMode="cover"
                />
                <Text style={styles.outfitLabel} numberOfLines={1}>
                  {look.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.primary,
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
          <Text style={{color: theme.colors.surface}}>Send Notification</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default HomeScreen;

/////////

// import React, {useEffect, useState} from 'react';
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
//       paddingTop: 20,
//       paddingBottom: 100,
//       paddingHorizontal: 20,
//     },
//     section: {
//       marginBottom: 32,
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
//       color: '#ddd',
//       marginTop: 4,
//     },
//     sectionTitle: {
//       fontSize: 17,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       paddingBottom: 10,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.1,
//       shadowRadius: 6,
//       elevation: 3,
//     },
//     dailyLookText: {
//       fontSize: 15,
//       color: theme.colors.foreground,
//       lineHeight: 22,
//     },
//     tryButton: {
//       backgroundColor: '#007AFF',
//       paddingVertical: 10,
//       borderRadius: 12,
//       marginTop: 16,
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
//       rowGap: 12,
//     },
//     tile: {
//       width: 182,
//       backgroundColor: '#007AFF',
//       borderRadius: 14,
//       paddingVertical: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.1,
//       shadowRadius: 4,
//       elevation: 2,
//       marginBottom: 12,
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
//       fontWeight: '500',
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
//       elevation: 2,
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
//       backgroundColor: '#007AFF',
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
//       <View style={{paddingHorizontal: 16, marginBottom: 8}}>
//         <Text
//           style={{
//             fontSize: 18,
//             color: theme.colors.foreground,
//             fontWeight: '800',
//             textAlign: 'center',
//             marginBottom: 4,
//           }}>
//           {firstName
//             ? `Hey ${firstName}, ready to get styled today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>
//       </View>
//       <View style={{position: 'relative', marginBottom: 20}}>
//         <Image
//           source={require('../assets/images/free1.jpg')}
//           style={styles.bannerImage}
//         />
//         <View style={styles.bannerOverlay}>
//           <Text style={styles.bannerText}>Discover Your Signature Look</Text>
//           <Text style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Text>
//         </View>
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

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>

//           <AppleTouchFeedback
//             onPress={() => navigate('Outfit', {look: 'editorial'})}>
//             <View style={styles.tryButton}>
//               <Text style={styles.tryButtonText}>Try This Look</Text>
//             </View>
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <AppleTouchFeedback onPress={() => navigate('Wardrobe')}>
//             <View style={styles.tile}>
//               <Text style={styles.tileText} numberOfLines={1}>
//                 Wardrobe
//               </Text>
//             </View>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback onPress={() => navigate('AddItem')}>
//             <View style={styles.tile}>
//               <Text style={styles.tileText} numberOfLines={1}>
//                 Add Item
//               </Text>
//             </View>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback onPress={() => navigate('Outfit')}>
//             <View style={styles.tile}>
//               <Text style={styles.tileText} numberOfLines={1}>
//                 Style Me
//               </Text>
//             </View>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback onPress={() => navigate('TryOnOverlay')}>
//             <View style={styles.tile}>
//               <Text style={styles.tileText} numberOfLines={1}>
//                 Try-On
//               </Text>
//             </View>
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Recommended Outfit</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//           {wardrobe.slice(0, 5).map((item, idx) => (
//             <View key={idx} style={styles.outfitCard}>
//               <Image
//                 source={{uri: item.image}}
//                 style={styles.outfitImage}
//                 resizeMode="cover"
//               />
//               <Text style={styles.outfitLabel} numberOfLines={1}>
//                 {item.name}
//               </Text>
//             </View>
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
//               <TouchableOpacity
//                 key={look.id}
//                 onPress={() => navigate('SavedOutfits')}
//                 style={styles.outfitCard}>
//                 <Image
//                   source={{uri: look.image}}
//                   style={styles.outfitImage}
//                   resizeMode="cover"
//                 />
//                 <Text style={styles.outfitLabel} numberOfLines={1}>
//                   {look.name}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </ScrollView>
//         )}
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Notifications</Text>
//         <TouchableOpacity
//           style={{
//             backgroundColor: theme.colors.primary,
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
//           <Text style={{color: theme.colors.surface}}>Send Notification</Text>
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;

////////////

// import React, {useEffect, useState} from 'react';
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

// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';

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
//       paddingTop: 20,
//       paddingBottom: 100,
//       paddingHorizontal: 20,
//     },
//     section: {
//       marginBottom: 32,
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
//       color: '#ddd',
//       marginTop: 4,
//     },
//     sectionTitle: {
//       fontSize: 17,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       paddingBottom: 10,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.1,
//       shadowRadius: 6,
//       elevation: 3,
//     },
//     dailyLookText: {
//       fontSize: 15,
//       color: theme.colors.foreground,
//       lineHeight: 22,
//     },
//     tryButton: {
//       backgroundColor: '#007AFF',
//       paddingVertical: 10,
//       borderRadius: 12,
//       marginTop: 16,
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
//       rowGap: 12,
//     },
//     tile: {
//       width: '48%',
//       backgroundColor: '#007AFF',
//       borderRadius: 14,
//       paddingVertical: 14,
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.1,
//       shadowRadius: 4,
//       elevation: 2,
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
//       fontWeight: '500',
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
//       elevation: 2,
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
//       backgroundColor: '#007AFF',
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
//       <View style={{paddingHorizontal: 16, marginBottom: 8}}>
//         <Text
//           style={{
//             fontSize: 18,
//             color: theme.colors.foreground,
//             fontWeight: '800',
//             textAlign: 'center',
//             marginBottom: 4,
//           }}>
//           {firstName
//             ? `Hey ${firstName}, ready to get styled today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>
//       </View>
//       <View style={{position: 'relative', marginBottom: 20}}>
//         <Image
//           source={require('../assets/images/free1.jpg')}
//           style={styles.bannerImage}
//         />
//         <View style={styles.bannerOverlay}>
//           <Text style={styles.bannerText}>Discover Your Signature Look</Text>
//           <Text style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Text>
//         </View>
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

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>
//           {/* <TouchableOpacity
//             style={styles.tryButton}
//             onPress={() => navigate('Outfit', {look: 'editorial'})}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity> */}
//           <TouchableOpacity
//             style={styles.tryButton}
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight', {
//                 enableVibrateFallback: true,
//                 ignoreAndroidSystemSettings: false,
//               });
//               navigate('Outfit', {look: 'editorial'});
//             }}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Wardrobe')}>
//             <Text style={styles.tileText}>Wardrobe</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Outfit')}>
//             <Text style={styles.tileText}>Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOnOverlay')}>
//             <Text style={styles.tileText}>Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Recommended Outfit</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//           {wardrobe.slice(0, 5).map((item, idx) => (
//             <View key={idx} style={styles.outfitCard}>
//               <Image
//                 source={{uri: item.image}}
//                 style={styles.outfitImage}
//                 resizeMode="cover"
//               />
//               <Text style={styles.outfitLabel} numberOfLines={1}>
//                 {item.name}
//               </Text>
//             </View>
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
//               <TouchableOpacity
//                 key={look.id}
//                 onPress={() => navigate('SavedOutfits')}
//                 style={styles.outfitCard}>
//                 <Image
//                   source={{uri: look.image}}
//                   style={styles.outfitImage}
//                   resizeMode="cover"
//                 />
//                 <Text style={styles.outfitLabel} numberOfLines={1}>
//                   {look.name}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </ScrollView>
//         )}
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Notifications</Text>
//         <TouchableOpacity
//           style={{
//             backgroundColor: theme.colors.primary,
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
//           <Text style={{color: theme.colors.surface}}>Send Notification</Text>
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;

//////////////

// import React, {useEffect, useState} from 'react';
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
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';

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
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100},
//     section: {marginBottom: 20},
//     bannerImage: {
//       width: '100%',
//       height: 180,
//       borderRadius: 14,
//     },
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.08,
//       shadowRadius: 4,
//       elevation: 3,
//       marginBottom: 10,
//     },
//     cardText: {
//       fontSize: 13,
//       lineHeight: 18,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     bannerOverlay: {
//       position: 'absolute',
//       bottom: 14,
//       left: 14,
//       right: 14,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       padding: 10,
//       borderRadius: 10,
//     },
//     bannerText: {
//       color: '#fff',
//       fontSize: 14,
//       fontWeight: '600',
//     },
//     bannerSubtext: {
//       color: '#ddd',
//       marginTop: 2,
//       fontSize: 12,
//     },
//     sectionTitle: {
//       fontWeight: '700',
//       fontSize: 14,
//       color: '#fff',
//       paddingHorizontal: 12,
//       paddingBottom: 14,
//     },
//     aiTitle: {
//       fontWeight: '700',
//       fontSize: 14,
//       color: '#fff',
//       paddingHorizontal: 16,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 14,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.06,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     dailyLookText: {
//       fontSize: 13,
//       color: theme.colors.foreground,
//       lineHeight: 18,
//     },
//     tryButton: {
//       backgroundColor: '#405de6',
//       paddingVertical: 6,
//       borderRadius: 8,
//       marginTop: 14,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       color: theme.colors.foreground,
//       fontWeight: '600',
//       fontSize: 16,
//       letterSpacing: 0.2,
//     },
//     tileRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     tile: {
//       width: '49.3%',
//       backgroundColor: '#405de6',
//       borderRadius: 8,
//       paddingVertical: 10,
//       marginBottom: 6,
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.05,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tileText: {
//       fontWeight: '600',
//       fontSize: 14,
//       color: theme.colors.foreground,
//       letterSpacing: 0.2,
//     },
//     highlightScroll: {
//       flexDirection: 'row',
//       paddingHorizontal: 12,
//     },
//     savedLookItem: {
//       alignItems: 'center',
//       marginRight: 10,
//     },
//     savedLookImageWrapper: {
//       width: 84,
//       height: 84,
//       borderRadius: 10,
//       backgroundColor: '#ccc',
//       overflow: 'hidden',
//     },
//     savedLookImage: {
//       width: 90,
//       height: 90,
//       borderRadius: 10,
//       marginHorizontal: 6,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 5,
//       borderRadius: 18,
//       marginRight: 6,
//       shadowColor: '#000',
//       shadowOpacity: 0.04,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tagText: {
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     sectionWeather: {
//       borderRadius: 16,
//       backgroundColor: theme.colors.surface,
//       padding: 16,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 10,
//       elevation: 2,
//     },
//     weatherTextBlock: {
//       flex: 1,
//     },
//     weatherCity: {
//       fontSize: 14,
//       fontWeight: '600',
//       color: '#fff',
//       marginBottom: 2,
//     },
//     weatherDesc: {
//       fontSize: 12,
//       color: '#ccc',
//     },
//     weatherTemp: {
//       fontSize: 28,
//       fontWeight: '800',
//       color: '#fff',
//     },
//     outfitCard: {
//       width: 84,
//       marginRight: 12,
//       alignItems: 'center',
//     },
//     outfitImage: {
//       width: 84,
//       height: 84,
//       borderRadius: 10,
//       backgroundColor: '#ccc',
//     },
//     outfitLabel: {
//       marginTop: 6,
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       maxWidth: 84,
//     },
//     weatherCard: {
//       backgroundColor: 'rgba(255,255,255,0.08)',
//       borderRadius: 16,
//       paddingVertical: 16,
//       paddingHorizontal: 16,
//       borderWidth: 0.5,
//       borderColor: 'rgba(255,255,255,0.2)',
//       justifyContent: 'center',
//       alignItems: 'flex-start',
//       height: 80,
//     },
//     weatherSuggestionWrapper: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingHorizontal: 8,
//     },
//     weatherTempContainer: {
//       backgroundColor: '#405de6',
//       paddingVertical: 6,
//       paddingHorizontal: 12,
//       borderRadius: 8,
//       alignSelf: 'flex-start',
//     },
//     weatherAdvice: {
//       fontSize: 14,
//       fontWeight: '600',
//       fontStyle: 'italic',
//       color: '#ffd369', // or theme.colors.accent / theme.colors.primary
//       marginTop: 10,
//     },
//     weatherAdviceBox: {
//       backgroundColor: 'rgba(255, 255, 255, 0.05)',
//       padding: 8,
//       borderRadius: 8,
//       marginTop: 10,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       <View style={{paddingHorizontal: 16, marginBottom: 8}}>
//         <Text
//           style={{
//             fontSize: 18,
//             color: theme.colors.foreground,
//             fontWeight: '800',
//             textAlign: 'center',
//             marginBottom: 4,
//           }}>
//           {firstName
//             ? `Hey ${firstName}, ready to get styled today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>
//       </View>
//       <View style={{position: 'relative', marginBottom: 20}}>
//         <Image
//           source={require('../assets/images/free1.jpg')}
//           style={styles.bannerImage}
//         />
//         <View style={styles.bannerOverlay}>
//           <Text style={styles.bannerText}>Discover Your Signature Look</Text>
//           <Text style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Text>
//         </View>
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

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>
//           <TouchableOpacity
//             style={styles.tryButton}
//             onPress={() => navigate('Outfit', {look: 'editorial'})}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Wardrobe')}>
//             <Text style={styles.tileText}>Wardrobe</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Outfit')}>
//             <Text style={styles.tileText}>Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOnOverlay')}>
//             <Text style={styles.tileText}>Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Recommended Outfit</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//           {wardrobe.slice(0, 5).map((item, idx) => (
//             <View key={idx} style={styles.outfitCard}>
//               <Image
//                 source={{uri: item.image}}
//                 style={styles.outfitImage}
//                 resizeMode="cover"
//               />
//               <Text style={styles.outfitLabel} numberOfLines={1}>
//                 {item.name}
//               </Text>
//             </View>
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Saved Looks</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//           {profileImages.map((img, index) => (
//             <Image
//               key={img.id || index.toString()}
//               source={{uri: img.uri}}
//               style={styles.savedLookImage}
//               resizeMode="cover"
//             />
//           ))}
//         </ScrollView>
//       </View>
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Notifications</Text>
//         <TouchableOpacity
//           style={{
//             backgroundColor: theme.colors.primary,
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
//           <Text style={{color: theme.colors.surface}}>Send Notification</Text>
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;

/////////////////

// import React, {useEffect, useState} from 'react';
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
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import {initializeNotifications} from '../utils/notificationService';

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

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();
//   const [weather, setWeather] = useState(null);

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
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100},
//     section: {marginBottom: 20},
//     bannerImage: {
//       width: '100%',
//       height: 180,
//       borderRadius: 14,
//     },
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.08,
//       shadowRadius: 4,
//       elevation: 3,
//       marginBottom: 10,
//     },
//     cardText: {
//       fontSize: 13,
//       lineHeight: 18,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     bannerOverlay: {
//       position: 'absolute',
//       bottom: 14,
//       left: 14,
//       right: 14,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       padding: 10,
//       borderRadius: 10,
//     },
//     bannerText: {
//       color: '#fff',
//       fontSize: 14,
//       fontWeight: '600',
//     },
//     bannerSubtext: {
//       color: '#ddd',
//       marginTop: 2,
//       fontSize: 12,
//     },
//     sectionTitle: {
//       fontWeight: '700',
//       fontSize: 14,
//       color: '#fff',
//       paddingHorizontal: 12,
//       paddingBottom: 14,
//     },
//     aiTitle: {
//       fontWeight: '700',
//       fontSize: 14,
//       color: '#fff',
//       paddingHorizontal: 16,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 14,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.06,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     dailyLookText: {
//       fontSize: 13,
//       color: theme.colors.foreground,
//       lineHeight: 18,
//     },
//     tryButton: {
//       backgroundColor: '#405de6',
//       paddingVertical: 6,
//       borderRadius: 8,
//       marginTop: 14,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       color: theme.colors.foreground,
//       fontWeight: '600',
//       fontSize: 16,
//       letterSpacing: 0.2,
//     },
//     tileRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     tile: {
//       width: '49.3%',
//       backgroundColor: '#405de6',
//       borderRadius: 8,
//       paddingVertical: 10,
//       marginBottom: 6,
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.05,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tileText: {
//       fontWeight: '600',
//       fontSize: 14,
//       color: theme.colors.foreground,
//       letterSpacing: 0.2,
//     },
//     highlightScroll: {
//       flexDirection: 'row',
//       paddingHorizontal: 12,
//     },
//     savedLookItem: {
//       alignItems: 'center',
//       marginRight: 10,
//     },
//     savedLookImageWrapper: {
//       width: 84,
//       height: 84,
//       borderRadius: 10,
//       backgroundColor: '#ccc',
//       overflow: 'hidden',
//     },
//     savedLookImage: {
//       width: 90,
//       height: 90,
//       borderRadius: 10,
//       marginHorizontal: 6,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 5,
//       borderRadius: 18,
//       marginRight: 6,
//       shadowColor: '#000',
//       shadowOpacity: 0.04,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tagText: {
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     sectionWeather: {
//       borderRadius: 16,
//       backgroundColor: theme.colors.surface,
//       padding: 16,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 10,
//       elevation: 2,
//     },
//     weatherTextBlock: {
//       flex: 1,
//     },
//     weatherCity: {
//       fontSize: 14,
//       fontWeight: '600',
//       color: '#fff',
//       marginBottom: 2,
//     },
//     weatherDesc: {
//       fontSize: 12,
//       color: '#ccc',
//     },
//     weatherTemp: {
//       fontSize: 28,
//       fontWeight: '800',
//       color: '#fff',
//     },
//     outfitCard: {
//       width: 84,
//       marginRight: 12,
//       alignItems: 'center',
//     },
//     outfitImage: {
//       width: 84,
//       height: 84,
//       borderRadius: 10,
//       backgroundColor: '#ccc',
//     },
//     outfitLabel: {
//       marginTop: 6,
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       maxWidth: 84,
//     },
//     weatherCard: {
//       backgroundColor: 'rgba(255,255,255,0.08)',
//       borderRadius: 16,
//       paddingVertical: 16,
//       paddingHorizontal: 16,
//       borderWidth: 0.5,
//       borderColor: 'rgba(255,255,255,0.2)',
//       justifyContent: 'center',
//       alignItems: 'flex-start',
//       height: 80,
//     },
//     weatherSuggestionWrapper: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingHorizontal: 8,
//     },
//     weatherTempContainer: {
//       backgroundColor: '#405de6',
//       paddingVertical: 6,
//       paddingHorizontal: 12,
//       borderRadius: 8,
//       alignSelf: 'flex-start',
//     },
//     weatherAdvice: {
//       fontSize: 14,
//       fontWeight: '600',
//       fontStyle: 'italic',
//       color: '#ffd369', // or theme.colors.accent / theme.colors.primary
//       marginTop: 10,
//     },
//     weatherAdviceBox: {
//       backgroundColor: 'rgba(255, 255, 255, 0.05)',
//       padding: 8,
//       borderRadius: 8,
//       marginTop: 10,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       <View style={{paddingHorizontal: 16, marginBottom: 8}}>
//         <Text
//           style={{
//             fontSize: 18,
//             color: theme.colors.foreground,
//             fontWeight: '800',
//             textAlign: 'center',
//             marginBottom: 4,
//           }}>
//           "Hey Mike, ready to get styled today?"
//         </Text>
//       </View>
//       <View style={{position: 'relative', marginBottom: 20}}>
//         <Image
//           source={require('../assets/images/free1.jpg')}
//           style={styles.bannerImage}
//         />
//         <View style={styles.bannerOverlay}>
//           <Text style={styles.bannerText}>Discover Your Signature Look</Text>
//           <Text style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Text>
//         </View>
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

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>
//           <TouchableOpacity
//             style={styles.tryButton}
//             onPress={() => navigate('Outfit', {look: 'editorial'})}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Closet')}>
//             <Text style={styles.tileText}>My Closet</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Outfit')}>
//             <Text style={styles.tileText}>Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOnOverlay')}>
//             <Text style={styles.tileText}>Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Recommended Outfit</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//           {wardrobe.slice(0, 5).map((item, idx) => (
//             <View key={idx} style={styles.outfitCard}>
//               <Image
//                 source={{uri: item.image}}
//                 style={styles.outfitImage}
//                 resizeMode="cover"
//               />
//               <Text style={styles.outfitLabel} numberOfLines={1}>
//                 {item.name}
//               </Text>
//             </View>
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Saved Looks</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//           {profileImages.map((img, index) => (
//             <Image
//               key={img.id || index.toString()}
//               source={{uri: img.uri}}
//               style={styles.savedLookImage}
//               resizeMode="cover"
//             />
//           ))}
//         </ScrollView>
//       </View>
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Notifications</Text>
//         <TouchableOpacity
//           style={{
//             backgroundColor: theme.colors.primary,
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
//           <Text style={{color: theme.colors.surface}}>Send Notification</Text>
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;
