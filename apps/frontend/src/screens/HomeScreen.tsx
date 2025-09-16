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
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
import {fetchWeather} from '../utils/travelWeather';
import {ensureLocationPermission} from '../utils/permissions';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
import {initializeNotifications} from '../utils/notificationService';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import Video from 'react-native-video';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import GlassCard from '../components/GlassCard/GlassCard';
import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
import {useVoiceControl} from '../hooks/useVoiceControl';
import {TextInput} from 'react-native';

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
  {
    id: 'look6',
    name: 'Monochrome Layers',
    image:
      'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look7',
    name: 'Tailored Casual',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look8',
    name: 'Gallery Ready',
    image:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look9',
    name: 'Warm Textures',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look10',
    name: 'Sharp Street',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look11',
    name: 'Monochrome Layers',
    image:
      'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look12',
    name: 'Tailored Casual',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look13',
    name: 'Gallery Ready',
    image:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look14',
    name: 'Warm Textures',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look15',
    name: 'Sharp Street',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look16',
    name: 'Monochrome Layers',
    image:
      'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look17',
    name: 'Tailored Casual',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look18',
    name: 'Gallery Ready',
    image:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look19',
    name: 'Warm Textures',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'look20',
    name: 'Sharp Street',
    image:
      'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
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
  const globalStyles = useGlobalStyles();
  const [weather, setWeather] = useState(null);
  const userId = useUUID();

  const [firstName, setFirstName] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedLook, setSelectedLook] = useState<any | null>(null);

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

  // 1) Add state + effect at the top of HomeScreen
  const [savedLooks, setSavedLooks] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const fetchSavedLooks = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch saved looks');
        const data = await res.json();
        console.log('📦 savedLooks data:', data); // 👈 ADD THIS
        setSavedLooks(data);
      } catch (err) {
        console.error('❌ Failed to fetch saved looks:', err);
      }
    };
    fetchSavedLooks();
  }, [userId]);

  // ✅ Voice hook (same working flow as SearchScreen)
  const {speech, isRecording, startListening, stopListening} =
    useVoiceControl();
  const [query, setQuery] = useState('');
  const speechRef = useRef('');
  const didNavigateRef = useRef(false);

  useEffect(() => {
    speechRef.current = speech;
    if (speech) {
      console.log('[HomeScreen] speech->query:', speech);
      setQuery(speech); // ✅ mirror spoken text into the input
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

  return (
    <Animated.ScrollView
      style={globalStyles.screen}
      contentContainerStyle={globalStyles.container}
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
        <View style={{alignItems: 'center'}}>
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
              {/* style={styles.sectionWeather}> */}
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
      {/* </View> */}
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

      <View style={[globalStyles.section, {marginTop: 12, marginBottom: 30}]}>
        <View
          style={{
            width: '100%',
            maxWidth: 645,
            alignSelf: 'center',
          }}>
          {/* 🎤 Hold to Talk Button */}
          <TouchableOpacity
            onPressIn={() => {
              console.log('[HomeScreen] PressIn -> startListening()');
              didNavigateRef.current = false;
              startListening();
            }}
            onPressOut={() => {
              console.log('[HomeScreen] PressOut -> stopListening()');
              stopListening();
              setTimeout(() => {
                const text = (speechRef.current || '').trim();
                if (text && !didNavigateRef.current) {
                  didNavigateRef.current = true;
                  console.log(
                    '[HomeScreen] navigating to Outfit with prompt:',
                    text,
                  );
                  // navigate('Outfit', {prompt: text});
                }
              }, 800);
            }}
            style={{
              backgroundColor: isRecording
                ? theme.colors.primary
                : theme.colors.surface2,
              borderRadius: tokens.borderRadius.md,
              paddingVertical: 16,
              paddingHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.colors.surfaceBorder,
            }}>
            <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
              {isRecording ? '🎤 Listening…' : '🎤 Hold to Talk'}
            </Text>
          </TouchableOpacity>

          {/* 📝 Live Text Input */}
          <TextInput
            placeholder="Your voice prompt will appear here..."
            placeholderTextColor={theme.colors.foreground}
            value={query}
            onChangeText={text => {
              console.log('[HomeScreen] onChangeText:', text);
              setQuery(text);
            }}
            style={{
              marginTop: 14,
              borderWidth: 1,
              borderColor: theme.colors.surfaceBorder,
              backgroundColor: theme.colors.surface,
              color: theme.colors.foreground,
              borderRadius: tokens.borderRadius.md,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
            }}
          />
        </View>
      </View>

      {/* /// QUICK ACCESS SECTION /// */}
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

                {label: 'Profile', screen: 'Profile'},
              ].map((btn, index) => (
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

      {/* ////// */}
      {/* <View style={globalStyles.sectionScroll}>
        <Text style={globalStyles.sectionTitle}>Recommended Outfit</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingRight: 8}}>
          {wardrobe.slice(0, 100).map((item, idx) => (
            <Animatable.View
              animation="fadeInUp"
              delay={100 * idx}
              duration={500}
              useNativeDriver
              key={item.id || idx}
              style={globalStyles.outfitCard}>
              <Image
                source={{uri: item.image}}
                style={[globalStyles.image4]}
                resizeMode="cover"
              />
              <Text
                style={[globalStyles.label, {marginTop: 6}]}
                numberOfLines={1}>
                {item.name}
              </Text>
            </Animatable.View>
          ))}
        </ScrollView>
      </View> */}

      {/* // 2) Replace your current "Saved Looks" section with this: */}
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
                  {/* <Image
                    source={{uri: look.image_url}}
                    style={[globalStyles.image4, {resizeMode: 'contain'}]}
                  /> */}
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

      <View style={{alignItems: 'center'}}>
        <AppleTouchFeedback
          style={[globalStyles.buttonPrimary, {width: 160}]}
          hapticStyle="impactHeavy"
          onPress={() => setSaveModalVisible(true)}>
          <Text style={globalStyles.buttonPrimaryText}>Add A Look</Text>
        </AppleTouchFeedback>
      </View>

      <SaveLookModal
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
      />

      <SavedLookPreviewModal
        visible={previewVisible}
        look={selectedLook}
        onClose={() => setPreviewVisible(false)}
      />

      {/* /// NOTIFICATIONS SECTION /// */}
      {/* <View style={globalStyles.centeredSection}>
        <View style={[globalStyles.section, {marginTop: 6}]}>
          <TouchableOpacity
            onPress={async () => {
              const enabled = await AsyncStorage.getItem(
                'notificationsEnabled',
              );
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
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <View style={[globalStyles.buttonPrimary]}>
                <Text style={globalStyles.buttonPrimaryText}>
                  Send Notification
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View> */}

      {/* ////// */}
    </Animated.ScrollView>
  );
};

export default HomeScreen;

//////////////////

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
// // import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import LinearGradient from 'react-native-linear-gradient';
// import {BlurView} from '@react-native-community/blur';
// // import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import GlassCard from '../components/GlassCard/GlassCard';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {TextInput} from 'react-native';

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
//   {
//     id: 'look6',
//     name: 'Monochrome Layers',
//     image:
//       'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look7',
//     name: 'Tailored Casual',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look8',
//     name: 'Gallery Ready',
//     image:
//       'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look9',
//     name: 'Warm Textures',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look10',
//     name: 'Sharp Street',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look11',
//     name: 'Monochrome Layers',
//     image:
//       'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look12',
//     name: 'Tailored Casual',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look13',
//     name: 'Gallery Ready',
//     image:
//       'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look14',
//     name: 'Warm Textures',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look15',
//     name: 'Sharp Street',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look16',
//     name: 'Monochrome Layers',
//     image:
//       'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look17',
//     name: 'Tailored Casual',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look18',
//     name: 'Gallery Ready',
//     image:
//       'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look19',
//     name: 'Warm Textures',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look20',
//     name: 'Sharp Street',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
// ];

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
//   const [weather, setWeather] = useState(null);
//   const userId = useUUID();

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);

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

//   // 1) Add state + effect at the top of HomeScreen
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);

//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         console.log('📦 savedLooks data:', data); // 👈 ADD THIS
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   // ✅ Voice hook (same working flow as SearchScreen)
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();
//   const speechRef = useRef('');
//   const didNavigateRef = useRef(false);
//   useEffect(() => {
//     speechRef.current = speech;
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

//   return (
//     <Animated.ScrollView
//       style={globalStyles.screen}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
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
//       <View style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Weather</Text>
//         {weather && (
//           <View style={globalStyles.cardStyles1}>
//             <Animatable.View
//               animation="fadeInUp"
//               duration={600}
//               delay={100}
//               useNativeDriver
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               {/* style={styles.sectionWeather}> */}
//               <View style={{flex: 1}}>
//                 <Text style={styles.weatherCity}>{weather.celsius.name}</Text>
//                 <Text style={styles.weatherDesc}>
//                   {weather.celsius.weather[0].description}
//                 </Text>
//                 <Text style={styles.weatherAdvice}>
//                   🌤️{' '}
//                   {weather.fahrenheit.main.temp < 50
//                     ? 'It’s chilly — layer up.'
//                     : weather.fahrenheit.main.temp > 85
//                     ? 'Hot day — keep it light.'
//                     : 'Perfect weather — dress freely.'}
//                 </Text>
//               </View>
//               <View style={styles.weatherTempContainer}>
//                 <Text style={styles.weatherTemp}>
//                   {Math.round(weather.fahrenheit.main.temp)}° F
//                 </Text>
//               </View>
//             </Animatable.View>
//           </View>
//         )}
//       </View>
//       {/* </View> */}
//       {/* ✅ Smart AI Nudge */}
//       {weather?.fahrenheit?.main?.temp < 55 && (
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

//       <View style={[globalStyles.section, {marginTop: 12, marginBottom: 30}]}>
//         <View
//           style={{
//             width: '100%',
//             maxWidth: 645,
//             alignSelf: 'center',
//           }}>
//           {/* 🔁 Replaced VoiceControlComponent with the same working hold-to-talk pattern as SearchScreen */}
//           <TouchableOpacity
//             onPressIn={() => {
//               console.log('[HomeScreen] PressIn -> startListening()');
//               didNavigateRef.current = false;
//               startListening();
//             }}
//             onPressOut={() => {
//               console.log('[HomeScreen] PressOut -> stopListening()');
//               stopListening();
//               // wait for hook's final commit (700ms fallback inside). Use 800ms to be safe.
//               setTimeout(() => {
//                 const text = (speechRef.current || '').trim();
//                 if (text && !didNavigateRef.current) {
//                   didNavigateRef.current = true;
//                   console.log(
//                     '[HomeScreen] navigating to Outfit with prompt:',
//                     text,
//                   );
//                   // navigate('Outfit', {prompt: text});
//                 }
//               }, 800);
//             }}
//             style={{
//               backgroundColor: isRecording
//                 ? theme.colors.primary
//                 : theme.colors.surface2,
//               borderRadius: tokens.borderRadius.md,
//               paddingVertical: 16,
//               paddingHorizontal: 16,
//               alignItems: 'center',
//               justifyContent: 'center',
//               borderWidth: 1,
//               borderColor: theme.colors.surfaceBorder,
//             }}>
//             <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
//               {isRecording ? '🎤 Listening…' : '🎤 Hold to Talk'}
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* /// EDITORIAL LOOK SECTION /// */}
//       <View style={[globalStyles.centeredSection]}>
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={800}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Animated.Text
//             style={[
//               globalStyles.sectionTitle,
//               {
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 60],
//                       outputRange: [0, -3],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               },
//             ]}>
//             Editorial Look
//           </Animated.Text>
//           <Animatable.View
//             animation="zoomIn"
//             delay={400}
//             duration={600}
//             useNativeDriver
//             style={globalStyles.cardStyles1}>
//             <Text style={styles.dailyLookText}>
//               Cream knit sweater layered over a sharp-collar shirt. Black
//               tailored trousers. Chelsea boots. Effortlessly sharp.
//             </Text>

//             <Animatable.View
//               animation="pulse"
//               iterationCount="infinite"
//               duration={2600}
//               style={{
//                 alignSelf: 'center',
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 60],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <AppleTouchFeedback
//                 hapticStyle="impactHeavy"
//                 onPress={() => navigate('Explore', {look: 'editorial'})}>
//                 <View
//                   style={[
//                     globalStyles.buttonPrimary,
//                     {marginTop: 14, marginBottom: 6, width: 160},
//                   ]}>
//                   <Text style={globalStyles.buttonPrimaryText}>
//                     Try This Look
//                   </Text>
//                 </View>
//               </AppleTouchFeedback>
//             </Animatable.View>
//           </Animatable.View>
//         </Animatable.View>
//       </View>

//       {/* /// QUICK ACCESS SECTION /// */}
//       <View style={globalStyles.centeredSection}>
//         <View style={globalStyles.section}>
//           <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//           <View style={[globalStyles.centeredSection]}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 10,
//                   justifyContent: 'center',
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   width: '100%',
//                 },
//               ]}>
//               {[
//                 {label: 'Wardrobe', screen: 'Wardrobe'},
//                 {label: 'Add Item', screen: 'AddItem'},
//                 {label: 'Style Me', screen: 'Outfit'},
//                 {label: 'Profile', screen: 'Profile'},
//               ].map((btn, index) => (
//                 <View key={btn.screen} style={styles.quickAccessItem}>
//                   <AppleTouchFeedback
//                     style={[globalStyles.buttonPrimary, {width: 160}]}
//                     hapticStyle="impactHeavy"
//                     onPress={() => navigate(btn.screen)}>
//                     <Text style={globalStyles.buttonPrimaryText}>
//                       {btn.label}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </View>
//               ))}
//             </View>
//           </View>
//         </View>
//       </View>

//       {/* ////// */}
//       {/* <View style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Recommended Outfit</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {wardrobe.slice(0, 100).map((item, idx) => (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={100 * idx}
//               duration={500}
//               useNativeDriver
//               key={item.id || idx}
//               style={globalStyles.outfitCard}>
//               <Image
//                 source={{uri: item.image}}
//                 style={[globalStyles.image4]}
//                 resizeMode="cover"
//               />
//               <Text
//                 style={[globalStyles.label, {marginTop: 6}]}
//                 numberOfLines={1}>
//                 {item.name}
//               </Text>
//             </Animatable.View>
//           ))}
//         </ScrollView>
//       </View> */}

//       {/* // 2) Replace your current "Saved Looks" section with this: */}
//       <View style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <Text style={{color: '#aaa', paddingLeft: 16, fontStyle: 'italic'}}>
//             You haven’t saved any outfits yet. Tap the heart on your favorite
//             looks!
//           </Text>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="fadeInUp"
//                 delay={index * 120}
//                 useNativeDriver
//                 style={globalStyles.outfitCard}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setSelectedLook(look);
//                     setPreviewVisible(true);
//                   }}
//                   style={{alignItems: 'center'}}>
//                   <Image
//                     source={{uri: look.image_url}}
//                     style={globalStyles.image4}
//                     resizeMode="cover"
//                   />
//                   {/* <Image
//                     source={{uri: look.image_url}}
//                     style={[globalStyles.image4, {resizeMode: 'contain'}]}
//                   /> */}
//                   <Text
//                     style={[globalStyles.label, {marginTop: 6}]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </View>

//       <View style={{alignItems: 'center'}}>
//         <AppleTouchFeedback
//           style={[globalStyles.buttonPrimary, {width: 160}]}
//           hapticStyle="impactHeavy"
//           onPress={() => setSaveModalVisible(true)}>
//           <Text style={globalStyles.buttonPrimaryText}>Add A Look</Text>
//         </AppleTouchFeedback>
//       </View>

//       <SaveLookModal
//         visible={saveModalVisible}
//         onClose={() => setSaveModalVisible(false)}
//       />

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />

//       {/* /// NOTIFICATIONS SECTION /// */}
//       {/* <View style={globalStyles.centeredSection}>
//         <View style={[globalStyles.section, {marginTop: 6}]}>
//           <TouchableOpacity
//             onPress={async () => {
//               const enabled = await AsyncStorage.getItem(
//                 'notificationsEnabled',
//               );
//               if (enabled === 'true') {
//                 PushNotification.localNotification({
//                   channelId: 'style-channel',
//                   title: '📣 Test Notification',
//                   message: 'This is a test style reminder!',
//                   playSound: true,
//                   soundName: 'default',
//                   importance: 4,
//                   vibrate: true,
//                 });
//               } else {
//                 console.log('🔕 Notifications are disabled');
//               }
//             }}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//               }}>
//               <View style={[globalStyles.buttonPrimary]}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Send Notification
//                 </Text>
//               </View>
//             </View>
//           </TouchableOpacity>
//         </View>
//       </View> */}

//       {/* ////// */}
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

///////////////////////

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
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import LinearGradient from 'react-native-linear-gradient';
// import {BlurView} from '@react-native-community/blur';
// // import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import GlassCard from '../components/GlassCard/GlassCard';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';

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
//   {
//     id: 'look6',
//     name: 'Monochrome Layers',
//     image:
//       'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look7',
//     name: 'Tailored Casual',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look8',
//     name: 'Gallery Ready',
//     image:
//       'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look9',
//     name: 'Warm Textures',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look10',
//     name: 'Sharp Street',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look11',
//     name: 'Monochrome Layers',
//     image:
//       'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look12',
//     name: 'Tailored Casual',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look13',
//     name: 'Gallery Ready',
//     image:
//       'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look14',
//     name: 'Warm Textures',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look15',
//     name: 'Sharp Street',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look16',
//     name: 'Monochrome Layers',
//     image:
//       'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look17',
//     name: 'Tailored Casual',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look18',
//     name: 'Gallery Ready',
//     image:
//       'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look19',
//     name: 'Warm Textures',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: 'look20',
//     name: 'Sharp Street',
//     image:
//       'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
// ];

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
//   const [weather, setWeather] = useState(null);
//   const userId = useUUID();

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);

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

//   // 1) Add state + effect at the top of HomeScreen
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);

//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         console.log('📦 savedLooks data:', data); // 👈 ADD THIS
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

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

//   return (
//     <Animated.ScrollView
//       style={globalStyles.screen}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
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
//       <View style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Weather</Text>
//         {weather && (
//           <View style={globalStyles.cardStyles1}>
//             <Animatable.View
//               animation="fadeInUp"
//               duration={600}
//               delay={100}
//               useNativeDriver
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               {/* style={styles.sectionWeather}> */}
//               <View style={{flex: 1}}>
//                 <Text style={styles.weatherCity}>{weather.celsius.name}</Text>
//                 <Text style={styles.weatherDesc}>
//                   {weather.celsius.weather[0].description}
//                 </Text>
//                 <Text style={styles.weatherAdvice}>
//                   🌤️{' '}
//                   {weather.fahrenheit.main.temp < 50
//                     ? 'It’s chilly — layer up.'
//                     : weather.fahrenheit.main.temp > 85
//                     ? 'Hot day — keep it light.'
//                     : 'Perfect weather — dress freely.'}
//                 </Text>
//               </View>
//               <View style={styles.weatherTempContainer}>
//                 <Text style={styles.weatherTemp}>
//                   {Math.round(weather.fahrenheit.main.temp)}° F
//                 </Text>
//               </View>
//             </Animatable.View>
//           </View>
//         )}
//       </View>
//       {/* </View> */}
//       {/* ✅ Smart AI Nudge */}
//       {weather?.fahrenheit?.main?.temp < 55 && (
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
//       <View style={[globalStyles.section, {marginTop: 12, marginBottom: 30}]}>
//         <View
//           style={{
//             width: '100%',
//             maxWidth: 645,
//             alignSelf: 'center',
//           }}>
//           <VoiceControlComponent
//             onPromptResult={prompt => navigate('Outfit', {prompt})}
//           />
//         </View>
//       </View>

//       {/* /// EDITORIAL LOOK SECTION /// */}
//       <View style={[globalStyles.centeredSection]}>
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={800}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Animated.Text
//             style={[
//               globalStyles.sectionTitle,
//               {
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 60],
//                       outputRange: [0, -3],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               },
//             ]}>
//             Editorial Look
//           </Animated.Text>
//           <Animatable.View
//             animation="zoomIn"
//             delay={400}
//             duration={600}
//             useNativeDriver
//             style={globalStyles.cardStyles1}>
//             <Text style={styles.dailyLookText}>
//               Cream knit sweater layered over a sharp-collar shirt. Black
//               tailored trousers. Chelsea boots. Effortlessly sharp.
//             </Text>

//             <Animatable.View
//               animation="pulse"
//               iterationCount="infinite"
//               duration={2600}
//               style={{
//                 alignSelf: 'center',
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 60],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <AppleTouchFeedback
//                 hapticStyle="impactHeavy"
//                 onPress={() => navigate('Explore', {look: 'editorial'})}>
//                 <View
//                   style={[
//                     globalStyles.buttonPrimary,
//                     {marginTop: 14, marginBottom: 6, width: 160},
//                   ]}>
//                   <Text style={globalStyles.buttonPrimaryText}>
//                     Try This Look
//                   </Text>
//                 </View>
//               </AppleTouchFeedback>
//             </Animatable.View>
//           </Animatable.View>
//         </Animatable.View>
//       </View>

//       {/* /// QUICK ACCESS SECTION /// */}
//       <View style={globalStyles.centeredSection}>
//         <View style={globalStyles.section}>
//           <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//           <View style={[globalStyles.centeredSection]}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 10,
//                   justifyContent: 'center',
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   width: '100%',
//                 },
//               ]}>
//               {[
//                 {label: 'Wardrobe', screen: 'Wardrobe'},
//                 {label: 'Add Item', screen: 'AddItem'},
//                 {label: 'Style Me', screen: 'Outfit'},
//                 {label: 'Profile', screen: 'Profile'},
//               ].map((btn, index) => (
//                 <View key={btn.screen} style={styles.quickAccessItem}>
//                   <AppleTouchFeedback
//                     style={[globalStyles.buttonPrimary, {width: 160}]}
//                     hapticStyle="impactHeavy"
//                     onPress={() => navigate(btn.screen)}>
//                     <Text style={globalStyles.buttonPrimaryText}>
//                       {btn.label}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </View>
//               ))}
//             </View>
//           </View>
//         </View>
//       </View>

//       {/* ////// */}
//       {/* <View style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Recommended Outfit</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {wardrobe.slice(0, 100).map((item, idx) => (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={100 * idx}
//               duration={500}
//               useNativeDriver
//               key={item.id || idx}
//               style={globalStyles.outfitCard}>
//               <Image
//                 source={{uri: item.image}}
//                 style={[globalStyles.image4]}
//                 resizeMode="cover"
//               />
//               <Text
//                 style={[globalStyles.label, {marginTop: 6}]}
//                 numberOfLines={1}>
//                 {item.name}
//               </Text>
//             </Animatable.View>
//           ))}
//         </ScrollView>
//       </View> */}

//       {/* // 2) Replace your current "Saved Looks" section with this: */}
//       <View style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <Text style={{color: '#aaa', paddingLeft: 16, fontStyle: 'italic'}}>
//             You haven’t saved any outfits yet. Tap the heart on your favorite
//             looks!
//           </Text>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="fadeInUp"
//                 delay={index * 120}
//                 useNativeDriver
//                 style={globalStyles.outfitCard}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setSelectedLook(look);
//                     setPreviewVisible(true);
//                   }}
//                   style={{alignItems: 'center'}}>
//                   <Image
//                     source={{uri: look.image_url}}
//                     style={globalStyles.image4}
//                     resizeMode="cover"
//                   />
//                   {/* <Image
//                     source={{uri: look.image_url}}
//                     style={[globalStyles.image4, {resizeMode: 'contain'}]}
//                   /> */}
//                   <Text
//                     style={[globalStyles.label, {marginTop: 6}]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </View>

//       <View style={{alignItems: 'center'}}>
//         <AppleTouchFeedback
//           style={[globalStyles.buttonPrimary, {width: 160}]}
//           hapticStyle="impactHeavy"
//           onPress={() => setSaveModalVisible(true)}>
//           <Text style={globalStyles.buttonPrimaryText}>Add A Look</Text>
//         </AppleTouchFeedback>
//       </View>

//       <SaveLookModal
//         visible={saveModalVisible}
//         onClose={() => setSaveModalVisible(false)}
//       />

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />

//       {/* /// NOTIFICATIONS SECTION /// */}
//       {/* <View style={globalStyles.centeredSection}>
//         <View style={[globalStyles.section, {marginTop: 6}]}>
//           <TouchableOpacity
//             onPress={async () => {
//               const enabled = await AsyncStorage.getItem(
//                 'notificationsEnabled',
//               );
//               if (enabled === 'true') {
//                 PushNotification.localNotification({
//                   channelId: 'style-channel',
//                   title: '📣 Test Notification',
//                   message: 'This is a test style reminder!',
//                   playSound: true,
//                   soundName: 'default',
//                   importance: 4,
//                   vibrate: true,
//                 });
//               } else {
//                 console.log('🔕 Notifications are disabled');
//               }
//             }}>
//             <View
//               style={{
//                 flex: 1,
//                 justifyContent: 'center',
//                 alignItems: 'center',
//               }}>
//               <View style={[globalStyles.buttonPrimary]}>
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Send Notification
//                 </Text>
//               </View>
//             </View>
//           </TouchableOpacity>
//         </View>
//       </View> */}

//       {/* ////// */}
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;
