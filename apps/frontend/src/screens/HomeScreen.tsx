import React, {useEffect, useState, useMemo, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Easing,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {fetchWeather} from '../utils/travelWeather';
import {ensureLocationPermission} from '../utils/permissions';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {initializeNotifications} from '../utils/notificationService';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
import {useHomePrefs} from '../hooks/useHomePrefs';
import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
import ReaderModal from '../components/FashionFeed/ReaderModal';
import {TooltipBubble} from '../components/ToolTip/ToolTip1';
import AiStylistSuggestions from '../components/AiStylistSuggestions/AiStylistSuggestions';
import {Surface} from '../components/Surface/Surface';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import SparkleIcon from '../assets/images/sparkle-icon.png';
// import Future1 from '../assets/images/future-icon1.png';

type Props = {
  navigate: (screen: string, params?: any) => void;
  wardrobe: any[];
};

const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
  const scrollY = useRef(new Animated.Value(0)).current;

  // Parallax / blur / shadow interpolations
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

  const {theme, setSkin} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const [weather, setWeather] = useState<any>(null);
  const userId = useUUID();

  // 🎨 Load user's saved theme mode from backend on app load
  useEffect(() => {
    if (!userId) return;
    const loadTheme = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch user');
        const data = await res.json();

        if (data?.theme_mode) {
          console.log('🎨 Applying saved theme:', data.theme_mode);
          setSkin(data.theme_mode);
        }
      } catch (err) {
        console.error('❌ Failed to load theme mode:', err);
      }
    };
    loadTheme();
  }, [userId, setSkin]);

  const [firstName, setFirstName] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedLook, setSelectedLook] = useState<any | null>(null);
  const [readerVisible, setReaderVisible] = useState(false);
  const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
  const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

  // Map dropdown state & animations
  // DEAFULT OPEN STATE
  const [mapVisible, setMapVisible] = useState(true);
  const chevron = useRef(new Animated.Value(1)).current;
  const mapHeight = useRef(new Animated.Value(220)).current;
  const mapOpacity = useRef(new Animated.Value(1)).current;
  const [mapOpen, setMapOpen] = useState(true);

  //  TOOL TIPS
  const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
  const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
    string | null
  >(null);

  const openArticle = (url: string, title?: string) => {
    setReaderUrl(url);
    setReaderTitle(title);
    setReaderVisible(true);
  };

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
    const restoreMapState = async () => {
      try {
        const savedState = await AsyncStorage.getItem('mapOpenState');
        if (savedState !== null) {
          const isOpen = JSON.parse(savedState);
          setMapOpen(isOpen);

          // Make sure animation reflects stored state
          mapHeight.setValue(isOpen ? 220 : 0);
          mapOpacity.setValue(isOpen ? 1 : 0);
          chevron.setValue(isOpen ? 1 : 0);
        }
      } catch (err) {
        console.error('❌ Failed to restore map state:', err);
      }
    };
    restoreMapState();
  }, []);

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

  const [savedLooks, setSavedLooks] = useState<any[]>([]);
  useEffect(() => {
    if (!userId) return;
    const fetchSavedLooks = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch saved looks');
        const data = await res.json();
        setSavedLooks(data);
      } catch (err) {
        console.error('❌ Failed to fetch saved looks:', err);
      }
    };
    fetchSavedLooks();
  }, [userId]);

  const toggleMap = async () => {
    if (mapOpen) {
      Animated.parallel([
        Animated.timing(mapHeight, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(mapOpacity, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(chevron, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(async () => {
        setMapOpen(false);
        await AsyncStorage.setItem('mapOpenState', JSON.stringify(false));
      });
    } else {
      setMapOpen(true);
      await AsyncStorage.setItem('mapOpenState', JSON.stringify(true));

      Animated.parallel([
        Animated.timing(mapHeight, {
          toValue: 220,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(mapOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(chevron, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const rotateZ = chevron.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const styles = StyleSheet.create({
    bannerImage: {width: '100%', height: 200},
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
      color: theme.colors.foreground,
    },
    bannerSubtext: {
      fontSize: 13,
      fontWeight: '400',
      color: theme.colors.foreground,
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
      color: theme.colors.foreground,
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
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    weatherDesc: {
      fontSize: 13,
      color: theme.colors.foreground2,
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
      color: theme.colors.buttonText1,
    },
    weatherAdvice: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffd369',
      marginTop: 4,
      lineHeight: 22,
      paddingRight: 14,
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
      color: theme.colors.foreground,
    },
    tooltip: {
      position: 'absolute',
      top: -38,
      backgroundColor: 'rgba(28,28,30,0.95)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      maxWidth: 180,
      zIndex: 999,
    },
    tooltipText: {
      color: '#fff',
      fontSize: 13,
      textAlign: 'center',
    },
    quickTooltip: {
      position: 'absolute',
      bottom: 60,
      backgroundColor: 'rgba(28,28,30,0.95)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      maxWidth: 180,
      zIndex: 999,
    },
    quickTooltipText: {
      color: '#fff',
      fontSize: 13,
      textAlign: 'center',
    },
  });

  if (!ready) {
    return <View style={globalStyles.screen} />;
  }

  return (
    <View style={{flex: 1}}>
      <Animated.ScrollView
        style={[globalStyles.screen]}
        contentContainerStyle={globalStyles.container}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {
            useNativeDriver: true,
          },
        )}>
        {/* Header Row: Greeting + Menu */}
        <Animatable.View
          animation="fadeInDown"
          duration={600}
          delay={100}
          useNativeDriver
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            marginBottom: 6,
          }}>
          <Text
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: '800',
              color: theme.colors.foreground,
            }}
            numberOfLines={1}
            ellipsizeMode="tail">
            {firstName
              ? `Hey ${firstName}, Ready to Get Styled Today?`
              : 'Hey there, ready to get styled today?'}
          </Text>

          <AppleTouchFeedback
            onPress={() => navigate('Settings')}
            hapticStyle="impactLight"
            style={{padding: 6, marginLeft: 10}}>
            <Icon name="tune" size={22} color={theme.colors.button1} />
          </AppleTouchFeedback>
        </Animatable.View>

        {/* Banner with ambient parallax + reveal */}
        {/* <View style={[globalStyles.section, {paddingHorizontal: 12}]}>
          <Surface>
            <Animated.View
              style={{
                overflow: 'hidden',
                shadowOffset: {width: 0, height: 6},
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
                borderWidth: tokens.borderWidth.md,
                borderColor: theme.colors.surfaceBorder,
                borderRadius: tokens.borderRadius.xl,
                width: '100%',
                height: 250,
                transform: [
                  {
                    translateY: scrollY.interpolate({
                      inputRange: [0, 100],
                      outputRange: [0, -10],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    scale: scrollY.interpolate({
                      inputRange: [-50, 0, 100],
                      outputRange: [1.05, 1, 0.97],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              }}>
          

              <Animatable.Text
                animation="fadeInDown"
                delay={200}
                style={[
                  {
                    color: theme.colors.foreground,
                    fontWeight: '800',
                    letterSpacing: 3,
                    fontSize: 55,
                    textAlign: 'left',
                    marginTop: 80,
                    marginLeft: 22,
                  },
                ]}>
                StylHelpr
              </Animatable.Text>
              <Animated.View
                style={{
                  width: 379,
                  position: 'absolute',
                  bottom: 10,
                  left: 15,
                  right: 16,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 6,
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
                  style={[
                    styles.bannerText,
                    {color: theme.colors.buttonText1},
                  ]}>
                  Discover Your Signature Look
                </Animatable.Text>
                <Animatable.Text
                  animation="fadeIn"
                  delay={400}
                  style={[
                    styles.bannerSubtext,
                    {color: theme.colors.buttonText1},
                  ]}>
                  Curated just for you this season.
                </Animatable.Text>
              </Animated.View>
            </Animated.View>
          </Surface>
        </View> */}

        {/* Banner with ambient parallax + reveal */}
        <View style={globalStyles.section}>
          <Animated.View
            style={{
              overflow: 'hidden',
              shadowOffset: {width: 0, height: 6},
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 5,
              borderWidth: tokens.borderWidth.md,
              borderColor: theme.colors.surfaceBorder,
              borderRadius: tokens.borderRadius.xl,
              backgroundColor: theme.colors.surface,
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, 100],
                    outputRange: [0, -10],
                    extrapolate: 'clamp',
                  }),
                },
                {
                  scale: scrollY.interpolate({
                    inputRange: [-50, 0, 100],
                    outputRange: [1.05, 1, 0.97],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}>
            <Image
              source={require('../assets/images/video-still-1.png')}
              style={{width: '100%', height: 200}}
              resizeMode="cover"
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
                style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
                Discover Your Signature Look
              </Animatable.Text>
              <Animatable.Text
                animation="fadeIn"
                delay={400}
                style={[
                  styles.bannerSubtext,
                  {color: theme.colors.buttonText1},
                ]}>
                Curated just for you this season.
              </Animatable.Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Weather Section */}
        {/* 🍎 Weather Section — Clean, Glanceable, Non-Redundant */}
        {prefs.weather && (
          <Animatable.View
            animation="fadeInUp"
            duration={700}
            delay={200}
            useNativeDriver
            style={globalStyles.section}>
            <Text style={globalStyles.sectionTitle}>Weather</Text>

            {weather && (
              <View
                style={[
                  globalStyles.cardStyles1,
                  {paddingVertical: 18, paddingHorizontal: 20},
                ]}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  {/* 🌤️ Left column — City, Condition, Icon */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flex: 1,
                    }}>
                    <Icon
                      name={(() => {
                        const condition = weather.celsius.weather[0].main;
                        if (condition === 'Rain') return 'umbrella';
                        if (condition === 'Snow') return 'ac-unit';
                        if (condition === 'Clouds') return 'wb-cloudy';
                        if (condition === 'Clear') return 'wb-sunny';
                        return 'wb-sunny';
                      })()}
                      size={36}
                      color={theme.colors.foreground}
                      style={{marginRight: 10}}
                    />
                    <View>
                      <Text
                        style={[
                          styles.weatherCity,
                          {fontSize: 20, fontWeight: '700'},
                        ]}>
                        {weather.celsius.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          color: theme.colors.foreground2,
                          textTransform: 'capitalize',
                        }}>
                        {weather.celsius.weather[0].description}
                      </Text>
                    </View>
                  </View>

                  {/* 🌡️ Right column — Big Temp */}
                  <View style={styles.weatherTempContainer}>
                    <Text
                      style={{
                        fontSize: 34,
                        fontWeight: '800',
                        color: theme.colors.buttonText1,
                      }}>
                      {Math.round(weather.fahrenheit.main.temp)}°F
                    </Text>
                  </View>
                </View>

                {/* 👇 Optional: short vibe line (kept minimal & non-overlapping) */}
                <View style={{marginTop: 12}}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: theme.colors.foreground2,
                      fontWeight: '500',
                    }}>
                    {(() => {
                      const temp = weather.fahrenheit.main.temp;
                      const condition = weather.celsius.weather[0].main;

                      if (temp < 25) return '❄️ Brutally Cold';
                      if (temp < 32)
                        return condition === 'Snow'
                          ? '🌨 Freezing & Snowy'
                          : '🥶 Freezing';
                      if (temp < 40)
                        return condition === 'Clouds'
                          ? '☁️ Bitter & Overcast'
                          : '🧤 Bitter Cold';
                      if (temp < 50)
                        return condition === 'Rain'
                          ? '🌧 Cold & Wet'
                          : '🧥 Chilly';
                      if (temp < 60)
                        return condition === 'Clouds'
                          ? '🌥 Cool & Cloudy'
                          : '🌤 Crisp & Cool';
                      if (temp < 70)
                        return condition === 'Clear'
                          ? '☀️ Mild & Bright'
                          : '🌤 Mild';
                      if (temp < 80)
                        return condition === 'Clear'
                          ? '☀️ Warm & Clear'
                          : '🌦 Warm';
                      if (temp < 90)
                        return condition === 'Rain'
                          ? '🌦 Hot & Humid'
                          : '🔥 Hot';
                      if (temp < 100) return '🥵 Very Hot';
                      return '🌋 Extreme Heat';
                    })()}
                  </Text>
                </View>
              </View>
            )}
          </Animatable.View>
        )}

        {/* AI SUGGESTS SECTION */}
        {prefs.aiSuggestions &&
          typeof weather?.fahrenheit?.main?.temp === 'number' && (
            <AiStylistSuggestions
              theme={theme}
              weather={weather}
              globalStyles={globalStyles}
              navigate={navigate}
              wardrobe={wardrobe}
            />
          )}

        {/* Map Section — collapsible with animated height & fade */}
        {prefs.locationMap && (
          <Animatable.View
            animation="fadeInUp"
            delay={300}
            duration={700}
            useNativeDriver
            style={globalStyles.section}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text style={globalStyles.sectionTitle}>Current Location</Text>
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={toggleMap}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surface3,
                  borderWidth: tokens.borderWidth.sm,
                  borderColor: theme.colors.surfaceBorder,
                }}>
                <View
                  style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <Text
                    style={{
                      color: theme.colors.foreground,
                      fontWeight: '700',
                      fontSize: 13,
                    }}>
                    {mapOpen ? 'Close' : 'Open'}
                  </Text>
                  <Animated.View style={{transform: [{rotateZ}]}}>
                    <Icon
                      name="keyboard-arrow-down"
                      size={18}
                      color={theme.colors.foreground}
                    />
                  </Animated.View>
                </View>
              </AppleTouchFeedback>
            </View>

            <Animated.View
              style={{
                marginTop: 8,
                height: mapHeight,
                opacity: mapOpacity,
                overflow: 'hidden',
              }}>
              <View
                style={[
                  globalStyles.cardStyles1,
                  {
                    padding: 1,
                    borderColor: theme.colors.surfaceBorder,
                    overflow: 'hidden',
                  },
                ]}>
                <LiveLocationMap
                  height={220}
                  useCustomPin={false}
                  postHeartbeat={false}
                />
              </View>
            </Animated.View>
          </Animatable.View>
        )}

        {/* Quick Access Section */}
        {prefs.quickAccess && (
          <Animatable.View
            animation="fadeInUp"
            delay={500}
            duration={700}
            useNativeDriver
            style={globalStyles.centeredSection}>
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
                    {label: 'Style Me', screen: 'Outfit'},
                    {label: 'Wardrobe', screen: 'Wardrobe'},
                    {label: 'Add Clothes', screen: 'AddItem'},
                    {label: 'Profile', screen: 'Profile'},
                  ].map((btn, idx) => (
                    <Animatable.View
                      key={btn.screen}
                      animation="zoomIn"
                      delay={600 + idx * 100}
                      duration={500}
                      useNativeDriver
                      style={styles.quickAccessItem}>
                      <AppleTouchFeedback
                        style={[globalStyles.buttonPrimary, {width: 160}]}
                        hapticStyle="impactHeavy"
                        onPress={() => navigate(btn.screen)}>
                        <Text style={globalStyles.buttonPrimaryText}>
                          {btn.label}
                        </Text>
                      </AppleTouchFeedback>
                    </Animatable.View>
                  ))}
                </View>
              </View>
            </View>
          </Animatable.View>
        )}

        {/* Top Fashion Stories / News Carousel */}
        {prefs.topFashionStories && (
          <Animatable.View
            animation="fadeInUp"
            delay={600}
            duration={700}
            useNativeDriver
            style={globalStyles.section}>
            <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
            <NewsCarousel onOpenArticle={openArticle} />
          </Animatable.View>
        )}

        {/* Discover / Recommended Items */}
        {prefs.recommendedItems && (
          <Animatable.View
            animation="fadeInUp"
            delay={700}
            duration={700}
            useNativeDriver
            style={globalStyles.section}>
            <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
            <DiscoverCarousel onOpenItem={openArticle} />
          </Animatable.View>
        )}

        {/* Saved Looks Section */}
        {prefs.savedLooks && (
          <Animatable.View
            animation="fadeInUp"
            delay={800}
            duration={700}
            useNativeDriver
            style={globalStyles.sectionScroll}>
            <View style={{flexDirection: 'row'}}>
              <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
            </View>

            {savedLooks.length === 0 ? (
              <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
                <Text style={globalStyles.missingDataMessage1}>
                  No saved looks.
                </Text>
                <TooltipBubble
                  message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
              favorite looks.'
                  position="top"
                />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingRight: 8}}>
                {savedLooks.map((look, index) => (
                  <Animatable.View
                    key={look.id}
                    animation="fadeInUp"
                    delay={900 + index * 100}
                    useNativeDriver
                    style={globalStyles.outfitCard}>
                    <AppleTouchFeedback
                      hapticStyle="impactLight"
                      onPress={() => {
                        setSelectedLook(look);
                        setPreviewVisible(true);
                      }}
                      style={{alignItems: 'center'}}>
                      <View>
                        <Image
                          source={{uri: look.image_url}}
                          style={[
                            globalStyles.image4,
                            {
                              borderColor: theme.colors.surfaceBorder,
                              borderWidth: tokens.borderWidth.md,
                              borderRadius: tokens.borderRadius.md,
                            },
                          ]}
                          resizeMode="cover"
                        />
                      </View>
                      <Text
                        style={[globalStyles.label, {marginTop: 6}]}
                        numberOfLines={1}>
                        {look.name}
                      </Text>
                    </AppleTouchFeedback>
                  </Animatable.View>
                ))}
              </ScrollView>
            )}
          </Animatable.View>
        )}

        {prefs.savedLooks && (
          <Animatable.View
            animation="fadeInUp"
            delay={1000}
            duration={700}
            useNativeDriver
            style={{alignItems: 'center', marginVertical: 16}}>
            <AppleTouchFeedback
              style={[globalStyles.buttonPrimary, {width: 125}]}
              hapticStyle="impactHeavy"
              onPress={() => setSaveModalVisible(true)}>
              <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
            </AppleTouchFeedback>
          </Animatable.View>
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
        <ReaderModal
          visible={readerVisible}
          url={readerUrl}
          title={readerTitle}
          onClose={() => setReaderVisible(false)}
        />
      </Animated.ScrollView>
    </View>
  );
};

export default HomeScreen;

/////////////////////

// import React, {useEffect, useState, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// // import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AiStylistSuggestions from '../components/AiStylistSuggestions/AiStylistSuggestions';
// import {Surface} from '../components/Surface/Surface';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// // import SparkleIcon from '../assets/images/sparkle-icon.png';
// // import Future1 from '../assets/images/future-icon1.png';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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
//     const restoreMapState = async () => {
//       try {
//         const savedState = await AsyncStorage.getItem('mapOpenState');
//         if (savedState !== null) {
//           const isOpen = JSON.parse(savedState);
//           setMapOpen(isOpen);

//           // Make sure animation reflects stored state
//           mapHeight.setValue(isOpen ? 220 : 0);
//           mapOpacity.setValue(isOpen ? 1 : 0);
//           chevron.setValue(isOpen ? 1 : 0);
//         }
//       } catch (err) {
//         console.error('❌ Failed to restore map state:', err);
//       }
//     };
//     restoreMapState();
//   }, []);

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const toggleMap = async () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(async () => {
//         setMapOpen(false);
//         await AsyncStorage.setItem('mapOpenState', JSON.stringify(false));
//       });
//     } else {
//       setMapOpen(true);
//       await AsyncStorage.setItem('mapOpenState', JSON.stringify(true));

//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
//     },
//     weatherAdvice: {
//       fontSize: 14,
//       fontWeight: '700',
//       color: '#ffd369',
//       marginTop: 4,
//       lineHeight: 22,
//       paddingRight: 14,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <View style={{flex: 1}}>
//       <Animated.ScrollView
//         style={[globalStyles.screen]}
//         contentContainerStyle={globalStyles.container}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {
//             useNativeDriver: true,
//           },
//         )}>
//         {/* Header Row: Greeting + Menu */}
//         <Animatable.View
//           animation="fadeInDown"
//           duration={600}
//           delay={100}
//           useNativeDriver
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             marginBottom: 6,
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: 17,
//               fontWeight: '800',
//               color: theme.colors.foreground,
//             }}
//             numberOfLines={1}
//             ellipsizeMode="tail">
//             {firstName
//               ? `Hey ${firstName}, Ready to Get Styled Today?`
//               : 'Hey there, ready to get styled today?'}
//           </Text>

//           <AppleTouchFeedback
//             onPress={() => navigate('Settings')}
//             hapticStyle="impactLight"
//             style={{padding: 6, marginLeft: 10}}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* Banner with ambient parallax + reveal */}
//         {/* <View style={[globalStyles.section, {paddingHorizontal: 12}]}>
//           <Surface>
//             <Animated.View
//               style={{
//                 overflow: 'hidden',
//                 shadowOffset: {width: 0, height: 6},
//                 shadowOpacity: 0.1,
//                 shadowRadius: 12,
//                 elevation: 5,
//                 borderWidth: tokens.borderWidth.md,
//                 borderColor: theme.colors.surfaceBorder,
//                 borderRadius: tokens.borderRadius.xl,
//                 width: '100%',
//                 height: 250,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -10],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                   {
//                     scale: scrollY.interpolate({
//                       inputRange: [-50, 0, 100],
//                       outputRange: [1.05, 1, 0.97],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>

//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[
//                   {
//                     color: theme.colors.foreground,
//                     fontWeight: '800',
//                     letterSpacing: 3,
//                     fontSize: 55,
//                     textAlign: 'left',
//                     marginTop: 80,
//                     marginLeft: 22,
//                   },
//                 ]}>
//                 StylHelpr
//               </Animatable.Text>
//               <Animated.View
//                 style={{
//                   width: 379,
//                   position: 'absolute',
//                   bottom: 10,
//                   left: 15,
//                   right: 16,
//                   backgroundColor: 'rgba(0,0,0,0.45)',
//                   padding: 16,
//                   borderRadius: 16,
//                   marginBottom: 6,
//                   transform: [
//                     {
//                       translateY: scrollY.interpolate({
//                         inputRange: [0, 100],
//                         outputRange: [0, -4],
//                         extrapolate: 'clamp',
//                       }),
//                     },
//                   ],
//                 }}>
//                 <Animatable.Text
//                   animation="fadeInDown"
//                   delay={200}
//                   style={[
//                     styles.bannerText,
//                     {color: theme.colors.buttonText1},
//                   ]}>
//                   Discover Your Signature Look
//                 </Animatable.Text>
//                 <Animatable.Text
//                   animation="fadeIn"
//                   delay={400}
//                   style={[
//                     styles.bannerSubtext,
//                     {color: theme.colors.buttonText1},
//                   ]}>
//                   Curated just for you this season.
//                 </Animatable.Text>
//               </Animated.View>
//             </Animated.View>
//           </Surface>
//         </View> */}

//         {/* Banner with ambient parallax + reveal */}
//         <View style={globalStyles.section}>
//           <Animated.View
//             style={{
//               overflow: 'hidden',
//               shadowOffset: {width: 0, height: 6},
//               shadowOpacity: 0.1,
//               shadowRadius: 12,
//               elevation: 5,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.surfaceBorder,
//               borderRadius: tokens.borderRadius.xl,
//               backgroundColor: theme.colors.surface,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -10],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//                 {
//                   scale: scrollY.interpolate({
//                     inputRange: [-50, 0, 100],
//                     outputRange: [1.05, 1, 0.97],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Image
//               source={require('../assets/images/video-still-1.png')}
//               style={{width: '100%', height: 200}}
//               resizeMode="cover"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: 12,
//                 borderRadius: 16,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//                 Discover Your Signature Look
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={400}
//                 style={[
//                   styles.bannerSubtext,
//                   {color: theme.colors.buttonText1},
//                 ]}>
//                 Curated just for you this season.
//               </Animatable.Text>
//             </Animated.View>
//           </Animated.View>
//         </View>

//         {/* Weather Section */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>
//             {weather && (
//               <View style={[globalStyles.cardStyles1]}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   duration={600}
//                   delay={100}
//                   useNativeDriver
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.weatherCity}>
//                       {weather.celsius.name}
//                     </Text>

//                     <Text style={styles.weatherDesc}>
//                       {weather.celsius.weather[0].description.replace(
//                         /\b\w/g,
//                         c => c.toUpperCase(),
//                       )}
//                     </Text>

//                     {/* <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {(() => {
//                         const temp = weather.fahrenheit.main.temp;
//                         const condition = weather.celsius.weather[0].main;

//                         if (temp < 40)
//                           return 'Very cold — bundle up with layers and a coat.';
//                         if (temp < 50)
//                           return 'Chilly — layer a knit or light jacket.';
//                         if (temp < 65)
//                           return 'Mild and comfortable — a shirt and light layer work perfectly.';
//                         if (temp < 80)
//                           return 'Warm — opt for breathable fabrics.';
//                         if (temp < 90) return 'Hot — keep it light and airy.';
//                         return 'Scorching — wear ultra-light pieces and stay hydrated.';
//                       })()}{' '}
//                       {(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain')
//                           return '☔ Grab an umbrella or waterproof layer.';
//                         if (condition === 'Snow')
//                           return '❄️ Insulated footwear and layers recommended.';
//                         if (condition === 'Clear')
//                           return '😎 Sunglasses might come in handy.';
//                         if (condition === 'Clouds')
//                           return '☁️ Great day for layering neutrals.';
//                         return '';
//                       })()}
//                     </Text> */}
//                     <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {(() => {
//                         const temp = weather.fahrenheit.main.temp;
//                         const condition = weather.celsius.weather[0].main;

//                         if (temp < 40) return 'Very cold';
//                         if (temp < 50) return 'Chilly';
//                         if (temp < 65) return 'Mild and comfortable';
//                         if (temp < 80) return 'Warm';
//                         if (temp < 90) return 'Hot';
//                         return 'Scorching';
//                       })()}{' '}
//                       {/* {(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain')
//                           return '☔ Grab an umbrella or waterproof layer.';
//                         if (condition === 'Snow')
//                           return '❄️ Insulated footwear and layers recommended.';
//                         if (condition === 'Clear')
//                           return '😎 Sunglasses might come in handy.';
//                         if (condition === 'Clouds')
//                           return '☁️ Great day for layering neutrals.';
//                         return '';
//                       })()} */}
//                     </Text>
//                   </View>

//                   <View style={styles.weatherTempContainer}>
//                     <Text style={styles.weatherTemp}>
//                       {Math.round(weather.fahrenheit.main.temp)}° F
//                     </Text>
//                   </View>
//                 </Animatable.View>
//               </View>
//             )}
//           </Animatable.View>
//         )}

//         {/* Smart AI Nudge */}
//         {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={400}
//             duration={800}
//             useNativeDriver
//             style={{
//               marginHorizontal: 16,
//               marginBottom: 20,
//               backgroundColor: theme.colors.surface,
//               borderRadius: 16,
//               padding: 16,
//               shadowColor: '#000',
//               shadowOpacity: 0.08,
//               shadowRadius: 6,
//               elevation: 3,
//             }}>
//             <Text
//               style={{
//                 fontSize: 15,
//                 fontWeight: '600',
//                 color: '#ffd369',
//                 fontStyle: 'italic',
//               }}>
//               🧥 It might rain later — consider a jacket with your look.
//             </Text>
//           </Animatable.View>
//         )}

//         {/* AI SUGGESTS SECTION */}
//         {prefs.aiSuggestions &&
//           typeof weather?.fahrenheit?.main?.temp === 'number' && (
//             <AiStylistSuggestions
//               theme={theme}
//               weather={weather}
//               globalStyles={globalStyles}
//               navigate={navigate}
//               wardrobe={wardrobe}
//             />
//           )}

//         {/* Map Section — collapsible with animated height & fade */}
//         {prefs.locationMap && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={300}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               <Text style={globalStyles.sectionTitle}>Current Location</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: 10,
//                   paddingVertical: 6,
//                   borderRadius: 20,
//                   backgroundColor: theme.colors.surface3,
//                   borderWidth: tokens.borderWidth.sm,
//                   borderColor: theme.colors.surfaceBorder,
//                 }}>
//                 <View
//                   style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                       fontSize: 13,
//                     }}>
//                     {mapOpen ? 'Close' : 'Open'}
//                   </Text>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={18}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 marginTop: 8,
//                 height: mapHeight,
//                 opacity: mapOpacity,
//                 overflow: 'hidden',
//               }}>
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     padding: 1,
//                     borderColor: theme.colors.surfaceBorder,
//                     overflow: 'hidden',
//                   },
//                 ]}>
//                 <LiveLocationMap
//                   height={220}
//                   useCustomPin={false}
//                   postHeartbeat={false}
//                 />
//               </View>
//             </Animated.View>
//           </Animatable.View>
//         )}

//         {/* Quick Access Section */}
//         {prefs.quickAccess && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={500}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.centeredSection}>
//             <View style={globalStyles.section}>
//               <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//               <View style={[globalStyles.centeredSection]}>
//                 <View
//                   style={[
//                     globalStyles.cardStyles1,
//                     {
//                       padding: 10,
//                       justifyContent: 'center',
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       width: '100%',
//                     },
//                   ]}>
//                   {[
//                     {label: 'Style Me', screen: 'Outfit'},
//                     {label: 'Wardrobe', screen: 'Wardrobe'},
//                     {label: 'Add Clothes', screen: 'AddItem'},
//                     {label: 'Profile', screen: 'Profile'},
//                   ].map((btn, idx) => (
//                     <Animatable.View
//                       key={btn.screen}
//                       animation="zoomIn"
//                       delay={600 + idx * 100}
//                       duration={500}
//                       useNativeDriver
//                       style={styles.quickAccessItem}>
//                       <AppleTouchFeedback
//                         style={[globalStyles.buttonPrimary, {width: 160}]}
//                         hapticStyle="impactHeavy"
//                         onPress={() => navigate(btn.screen)}>
//                         <Text style={globalStyles.buttonPrimaryText}>
//                           {btn.label}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Top Fashion Stories / News Carousel */}
//         {prefs.topFashionStories && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={600}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//             <NewsCarousel onOpenArticle={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Discover / Recommended Items */}
//         {prefs.recommendedItems && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={700}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//             <DiscoverCarousel onOpenItem={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={800}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.sectionScroll}>
//             <View style={{flexDirection: 'row'}}>
//               <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//             </View>

//             {savedLooks.length === 0 ? (
//               <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                 <Text style={globalStyles.missingDataMessage1}>
//                   No saved looks.
//                 </Text>
//                 <TooltipBubble
//                   message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                   position="top"
//                 />
//               </View>
//             ) : (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={{paddingRight: 8}}>
//                 {savedLooks.map((look, index) => (
//                   <Animatable.View
//                     key={look.id}
//                     animation="fadeInUp"
//                     delay={900 + index * 100}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         setSelectedLook(look);
//                         setPreviewVisible(true);
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <View>
//                         <Image
//                           source={{uri: look.image_url}}
//                           style={[
//                             globalStyles.image4,
//                             {
//                               borderColor: theme.colors.surfaceBorder,
//                               borderWidth: tokens.borderWidth.md,
//                               borderRadius: tokens.borderRadius.md,
//                             },
//                           ]}
//                           resizeMode="cover"
//                         />
//                       </View>
//                       <Text
//                         style={[globalStyles.label, {marginTop: 6}]}
//                         numberOfLines={1}>
//                         {look.name}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             )}
//           </Animatable.View>
//         )}

//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={1000}
//             duration={700}
//             useNativeDriver
//             style={{alignItems: 'center', marginVertical: 16}}>
//             <AppleTouchFeedback
//               style={[globalStyles.buttonPrimary, {width: 125}]}
//               hapticStyle="impactHeavy"
//               onPress={() => setSaveModalVisible(true)}>
//               <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         )}

//         <SaveLookModal
//           visible={saveModalVisible}
//           onClose={() => setSaveModalVisible(false)}
//         />
//         <SavedLookPreviewModal
//           visible={previewVisible}
//           look={selectedLook}
//           onClose={() => setPreviewVisible(false)}
//         />
//         <ReaderModal
//           visible={readerVisible}
//           url={readerUrl}
//           title={readerTitle}
//           onClose={() => setReaderVisible(false)}
//         />
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

///////////////

// import React, {useEffect, useState, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// // import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AiStylistSuggestions from '../components/AiStylistSuggestions/AiStylistSuggestions';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
//     },
//     weatherAdvice: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: '#ffd369',
//       marginTop: 4,
//       lineHeight: 22,
//       paddingRight: 14,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <View style={{flex: 1}}>
//       <Animated.ScrollView
//         style={[globalStyles.screen]}
//         contentContainerStyle={globalStyles.container}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {
//             useNativeDriver: true,
//           },
//         )}>
//         {/* Header Row: Greeting + Menu */}
//         <Animatable.View
//           animation="fadeInDown"
//           duration={600}
//           delay={100}
//           useNativeDriver
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             marginBottom: 6,
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: 17,
//               fontWeight: '800',
//               color: theme.colors.foreground,
//             }}
//             numberOfLines={1}
//             ellipsizeMode="tail">
//             {firstName
//               ? `Hey ${firstName}, Ready to Get Styled Today?`
//               : 'Hey there, ready to get styled today?'}
//           </Text>

//           <AppleTouchFeedback
//             onPress={() => navigate('Settings')}
//             hapticStyle="impactLight"
//             style={{padding: 6, marginLeft: 10}}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* Video Banner with ambient parallax + reveal */}
//         {/* <View style={globalStyles.section}>
//           <Animated.View
//             style={{
//               overflow: 'hidden',
//               shadowOffset: {width: 0, height: 6},
//               shadowOpacity: 0.1,
//               shadowRadius: 12,
//               elevation: 5,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.surfaceBorder,
//               borderRadius: tokens.borderRadius.xl,
//               backgroundColor: theme.colors.surface,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -10],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//                 {
//                   scale: scrollY.interpolate({
//                     inputRange: [-50, 0, 100],
//                     outputRange: [1.05, 1, 0.97],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Video
//               source={require('../assets/images/free4.mp4')}
//               style={{width: '100%', height: 200}}
//               muted
//               repeat
//               resizeMode="cover"
//               rate={1.0}
//               ignoreSilentSwitch="obey"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: 12,
//                 borderRadius: 16,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//                 Discover Your Signature Look
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={400}
//                 style={[
//                   styles.bannerSubtext,
//                   {color: theme.colors.buttonText1},
//                 ]}>
//                 Curated just for you this season.
//               </Animatable.Text>
//             </Animated.View>
//           </Animated.View>
//         </View> */}

//         {/* Banner with ambient parallax + reveal */}
//         <View style={globalStyles.section}>
//           <Animated.View
//             style={{
//               overflow: 'hidden',
//               shadowOffset: {width: 0, height: 6},
//               shadowOpacity: 0.1,
//               shadowRadius: 12,
//               elevation: 5,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.surfaceBorder,
//               borderRadius: tokens.borderRadius.xl,
//               backgroundColor: theme.colors.surface,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -10],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//                 {
//                   scale: scrollY.interpolate({
//                     inputRange: [-50, 0, 100],
//                     outputRange: [1.05, 1, 0.97],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Image
//               source={require('../assets/images/video-still-1.png')}
//               style={{width: '100%', height: 200}}
//               resizeMode="cover"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: 12,
//                 borderRadius: 16,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//                 Discover Your Signature Look
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={400}
//                 style={[
//                   styles.bannerSubtext,
//                   {color: theme.colors.buttonText1},
//                 ]}>
//                 Curated just for you this season.
//               </Animatable.Text>
//             </Animated.View>
//           </Animated.View>
//         </View>

//         {/* Weather Section */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>
//             {weather && (
//               <View style={[globalStyles.cardStyles1]}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   duration={600}
//                   delay={100}
//                   useNativeDriver
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.weatherCity}>
//                       {weather.celsius.name}
//                     </Text>

//                     <Text style={styles.weatherDesc}>
//                       {weather.celsius.weather[0].description.replace(
//                         /\b\w/g,
//                         c => c.toUpperCase(),
//                       )}
//                     </Text>

//                     {/* <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {(() => {
//                         const temp = weather.fahrenheit.main.temp;
//                         const condition = weather.celsius.weather[0].main;

//                         if (temp < 40)
//                           return 'Very cold — bundle up with layers and a coat.';
//                         if (temp < 50)
//                           return 'Chilly — layer a knit or light jacket.';
//                         if (temp < 65)
//                           return 'Mild and comfortable — a shirt and light layer work perfectly.';
//                         if (temp < 80)
//                           return 'Warm — opt for breathable fabrics.';
//                         if (temp < 90) return 'Hot — keep it light and airy.';
//                         return 'Scorching — wear ultra-light pieces and stay hydrated.';
//                       })()}{' '}
//                       {(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain')
//                           return '☔ Grab an umbrella or waterproof layer.';
//                         if (condition === 'Snow')
//                           return '❄️ Insulated footwear and layers recommended.';
//                         if (condition === 'Clear')
//                           return '😎 Sunglasses might come in handy.';
//                         if (condition === 'Clouds')
//                           return '☁️ Great day for layering neutrals.';
//                         return '';
//                       })()}
//                     </Text> */}
//                     <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {(() => {
//                         const temp = weather.fahrenheit.main.temp;
//                         const condition = weather.celsius.weather[0].main;

//                         if (temp < 40) return 'Very cold';
//                         if (temp < 50) return 'Chilly';
//                         if (temp < 65) return 'Mild and comfortable';
//                         if (temp < 80) return 'Warm';
//                         if (temp < 90) return 'Hot';
//                         return 'Scorching';
//                       })()}{' '}
//                       {/* {(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain')
//                           return '☔ Grab an umbrella or waterproof layer.';
//                         if (condition === 'Snow')
//                           return '❄️ Insulated footwear and layers recommended.';
//                         if (condition === 'Clear')
//                           return '😎 Sunglasses might come in handy.';
//                         if (condition === 'Clouds')
//                           return '☁️ Great day for layering neutrals.';
//                         return '';
//                       })()} */}
//                     </Text>
//                   </View>

//                   <View style={styles.weatherTempContainer}>
//                     <Text style={styles.weatherTemp}>
//                       {Math.round(weather.fahrenheit.main.temp)}° F
//                     </Text>
//                   </View>
//                 </Animatable.View>
//               </View>
//             )}
//           </Animatable.View>
//         )}

//         {/* Smart AI Nudge */}
//         {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={400}
//             duration={800}
//             useNativeDriver
//             style={{
//               marginHorizontal: 16,
//               marginBottom: 20,
//               backgroundColor: theme.colors.surface,
//               borderRadius: 16,
//               padding: 16,
//               shadowColor: '#000',
//               shadowOpacity: 0.08,
//               shadowRadius: 6,
//               elevation: 3,
//             }}>
//             <Text
//               style={{
//                 fontSize: 15,
//                 fontWeight: '600',
//                 color: '#ffd369',
//                 fontStyle: 'italic',
//               }}>
//               🧥 It might rain later — consider a jacket with your look.
//             </Text>
//           </Animatable.View>
//         )}

//         {/* AI SUGGESTS SECTION */}
//         {prefs.aiSuggestions &&
//           typeof weather?.fahrenheit?.main?.temp === 'number' && (
//             <AiStylistSuggestions
//               theme={theme}
//               weather={weather}
//               globalStyles={globalStyles}
//               navigate={navigate}
//               wardrobe={wardrobe}
//             />
//           )}

//         {/* Map Section — collapsible with animated height & fade */}
//         {prefs.locationMap && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={300}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               <Text style={globalStyles.sectionTitle}>Current Location</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: 10,
//                   paddingVertical: 6,
//                   borderRadius: 20,
//                   backgroundColor: theme.colors.surface3,
//                   borderWidth: tokens.borderWidth.sm,
//                   borderColor: theme.colors.surfaceBorder,
//                 }}>
//                 <View
//                   style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                       fontSize: 13,
//                     }}>
//                     {mapOpen ? 'Close' : 'Open'}
//                   </Text>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={18}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 marginTop: 8,
//                 height: mapHeight,
//                 opacity: mapOpacity,
//                 overflow: 'hidden',
//               }}>
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     padding: 1,
//                     borderColor: theme.colors.surfaceBorder,
//                     overflow: 'hidden',
//                   },
//                 ]}>
//                 <LiveLocationMap
//                   height={220}
//                   useCustomPin={false}
//                   postHeartbeat={false}
//                 />
//               </View>
//             </Animated.View>
//           </Animatable.View>
//         )}

//         {/* Quick Access Section */}
//         {prefs.quickAccess && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={500}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.centeredSection}>
//             <View style={globalStyles.section}>
//               <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//               <View style={[globalStyles.centeredSection]}>
//                 <View
//                   style={[
//                     globalStyles.cardStyles1,
//                     {
//                       padding: 10,
//                       justifyContent: 'center',
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       width: '100%',
//                     },
//                   ]}>
//                   {[
//                     {label: 'Style Me', screen: 'Outfit'},
//                     {label: 'Wardrobe', screen: 'Wardrobe'},
//                     {label: 'Add Clothes', screen: 'AddItem'},
//                     {label: 'Profile', screen: 'Profile'},
//                   ].map((btn, idx) => (
//                     <Animatable.View
//                       key={btn.screen}
//                       animation="zoomIn"
//                       delay={600 + idx * 100}
//                       duration={500}
//                       useNativeDriver
//                       style={styles.quickAccessItem}>
//                       <AppleTouchFeedback
//                         style={[globalStyles.buttonPrimary, {width: 160}]}
//                         hapticStyle="impactHeavy"
//                         onPress={() => navigate(btn.screen)}>
//                         <Text style={globalStyles.buttonPrimaryText}>
//                           {btn.label}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Top Fashion Stories / News Carousel */}
//         {prefs.topFashionStories && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={600}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//             <NewsCarousel onOpenArticle={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Discover / Recommended Items */}
//         {prefs.recommendedItems && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={700}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//             <DiscoverCarousel onOpenItem={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={800}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.sectionScroll}>
//             <View style={{flexDirection: 'row'}}>
//               <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//             </View>

//             {savedLooks.length === 0 ? (
//               <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                 <Text style={globalStyles.missingDataMessage1}>
//                   No saved looks.
//                 </Text>
//                 <TooltipBubble
//                   message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                   position="top"
//                 />
//               </View>
//             ) : (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={{paddingRight: 8}}>
//                 {savedLooks.map((look, index) => (
//                   <Animatable.View
//                     key={look.id}
//                     animation="fadeInUp"
//                     delay={900 + index * 100}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         setSelectedLook(look);
//                         setPreviewVisible(true);
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <View>
//                         <Image
//                           source={{uri: look.image_url}}
//                           style={[
//                             globalStyles.image4,
//                             {
//                               borderColor: theme.colors.surfaceBorder,
//                               borderWidth: tokens.borderWidth.md,
//                               borderRadius: tokens.borderRadius.md,
//                             },
//                           ]}
//                           resizeMode="cover"
//                         />
//                       </View>
//                       <Text
//                         style={[globalStyles.label, {marginTop: 6}]}
//                         numberOfLines={1}>
//                         {look.name}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             )}
//           </Animatable.View>
//         )}

//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={1000}
//             duration={700}
//             useNativeDriver
//             style={{alignItems: 'center', marginVertical: 16}}>
//             <AppleTouchFeedback
//               style={[globalStyles.buttonPrimary, {width: 125}]}
//               hapticStyle="impactHeavy"
//               onPress={() => setSaveModalVisible(true)}>
//               <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         )}

//         <SaveLookModal
//           visible={saveModalVisible}
//           onClose={() => setSaveModalVisible(false)}
//         />
//         <SavedLookPreviewModal
//           visible={previewVisible}
//           look={selectedLook}
//           onClose={() => setPreviewVisible(false)}
//         />
//         <ReaderModal
//           visible={readerVisible}
//           url={readerUrl}
//           title={readerTitle}
//           onClose={() => setReaderVisible(false)}
//         />
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

//////////////////////

// import React, {useEffect, useState, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// // import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AiStylistSuggestions from '../components/AiStylistSuggestions/AiStylistSuggestions';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
//     },
//     weatherAdvice: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: '#ffd369',
//       marginTop: 4,
//       lineHeight: 22,
//       paddingRight: 14,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <View style={{flex: 1}}>
//       <Animated.ScrollView
//         style={[globalStyles.screen]}
//         contentContainerStyle={globalStyles.container}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {
//             useNativeDriver: true,
//           },
//         )}>
//         {/* Header Row: Greeting + Menu */}
//         <Animatable.View
//           animation="fadeInDown"
//           duration={600}
//           delay={100}
//           useNativeDriver
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             marginBottom: 6,
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: 17,
//               fontWeight: '800',
//               color: theme.colors.foreground,
//             }}
//             numberOfLines={1}
//             ellipsizeMode="tail">
//             {firstName
//               ? `Hey ${firstName}, Ready to Get Styled Today?`
//               : 'Hey there, ready to get styled today?'}
//           </Text>

//           <AppleTouchFeedback
//             onPress={() => navigate('Settings')}
//             hapticStyle="impactLight"
//             style={{padding: 6, marginLeft: 10}}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* Video Banner with ambient parallax + reveal */}
//         {/* <View style={globalStyles.section}>
//           <Animated.View
//             style={{
//               overflow: 'hidden',
//               shadowOffset: {width: 0, height: 6},
//               shadowOpacity: 0.1,
//               shadowRadius: 12,
//               elevation: 5,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.surfaceBorder,
//               borderRadius: tokens.borderRadius.xl,
//               backgroundColor: theme.colors.surface,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -10],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//                 {
//                   scale: scrollY.interpolate({
//                     inputRange: [-50, 0, 100],
//                     outputRange: [1.05, 1, 0.97],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Video
//               source={require('../assets/images/free4.mp4')}
//               style={{width: '100%', height: 200}}
//               muted
//               repeat
//               resizeMode="cover"
//               rate={1.0}
//               ignoreSilentSwitch="obey"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: 12,
//                 borderRadius: 16,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//                 Discover Your Signature Look
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={400}
//                 style={[
//                   styles.bannerSubtext,
//                   {color: theme.colors.buttonText1},
//                 ]}>
//                 Curated just for you this season.
//               </Animatable.Text>
//             </Animated.View>
//           </Animated.View>
//         </View> */}

//         {/* Banner with ambient parallax + reveal */}
//         <View style={globalStyles.section}>
//           <Animated.View
//             style={{
//               overflow: 'hidden',
//               shadowOffset: {width: 0, height: 6},
//               shadowOpacity: 0.1,
//               shadowRadius: 12,
//               elevation: 5,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.surfaceBorder,
//               borderRadius: tokens.borderRadius.xl,
//               backgroundColor: theme.colors.surface,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -10],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//                 {
//                   scale: scrollY.interpolate({
//                     inputRange: [-50, 0, 100],
//                     outputRange: [1.05, 1, 0.97],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Image
//               source={require('../assets/images/video-still-1.png')}
//               style={{width: '100%', height: 200}}
//               resizeMode="cover"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: 12,
//                 borderRadius: 16,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//                 Discover Your Signature Look
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={400}
//                 style={[
//                   styles.bannerSubtext,
//                   {color: theme.colors.buttonText1},
//                 ]}>
//                 Curated just for you this season.
//               </Animatable.Text>
//             </Animated.View>
//           </Animated.View>
//         </View>

//         {/* Weather Section */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>
//             {weather && (
//               <View style={[globalStyles.cardStyles1]}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   duration={600}
//                   delay={100}
//                   useNativeDriver
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.weatherCity}>
//                       {weather.celsius.name}
//                     </Text>

//                     <Text style={styles.weatherDesc}>
//                       {weather.celsius.weather[0].description.replace(
//                         /\b\w/g,
//                         c => c.toUpperCase(),
//                       )}
//                     </Text>

//                     {/* <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {(() => {
//                         const temp = weather.fahrenheit.main.temp;
//                         const condition = weather.celsius.weather[0].main;

//                         if (temp < 40)
//                           return 'Very cold — bundle up with layers and a coat.';
//                         if (temp < 50)
//                           return 'Chilly — layer a knit or light jacket.';
//                         if (temp < 65)
//                           return 'Mild and comfortable — a shirt and light layer work perfectly.';
//                         if (temp < 80)
//                           return 'Warm — opt for breathable fabrics.';
//                         if (temp < 90) return 'Hot — keep it light and airy.';
//                         return 'Scorching — wear ultra-light pieces and stay hydrated.';
//                       })()}{' '}
//                       {(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain')
//                           return '☔ Grab an umbrella or waterproof layer.';
//                         if (condition === 'Snow')
//                           return '❄️ Insulated footwear and layers recommended.';
//                         if (condition === 'Clear')
//                           return '😎 Sunglasses might come in handy.';
//                         if (condition === 'Clouds')
//                           return '☁️ Great day for layering neutrals.';
//                         return '';
//                       })()}
//                     </Text> */}
//                     <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {(() => {
//                         const temp = weather.fahrenheit.main.temp;
//                         const condition = weather.celsius.weather[0].main;

//                         if (temp < 40) return 'Very cold';
//                         if (temp < 50) return 'Chilly';
//                         if (temp < 65) return 'Mild and comfortable';
//                         if (temp < 80) return 'Warm';
//                         if (temp < 90) return 'Hot';
//                         return 'Scorching';
//                       })()}{' '}
//                       {/* {(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain')
//                           return '☔ Grab an umbrella or waterproof layer.';
//                         if (condition === 'Snow')
//                           return '❄️ Insulated footwear and layers recommended.';
//                         if (condition === 'Clear')
//                           return '😎 Sunglasses might come in handy.';
//                         if (condition === 'Clouds')
//                           return '☁️ Great day for layering neutrals.';
//                         return '';
//                       })()} */}
//                     </Text>
//                   </View>

//                   <View style={styles.weatherTempContainer}>
//                     <Text style={styles.weatherTemp}>
//                       {Math.round(weather.fahrenheit.main.temp)}° F
//                     </Text>
//                   </View>
//                 </Animatable.View>
//               </View>
//             )}
//           </Animatable.View>
//         )}

//         {/* Smart AI Nudge */}
//         {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={400}
//             duration={800}
//             useNativeDriver
//             style={{
//               marginHorizontal: 16,
//               marginBottom: 20,
//               backgroundColor: theme.colors.surface,
//               borderRadius: 16,
//               padding: 16,
//               shadowColor: '#000',
//               shadowOpacity: 0.08,
//               shadowRadius: 6,
//               elevation: 3,
//             }}>
//             <Text
//               style={{
//                 fontSize: 15,
//                 fontWeight: '600',
//                 color: '#ffd369',
//                 fontStyle: 'italic',
//               }}>
//               🧥 It might rain later — consider a jacket with your look.
//             </Text>
//           </Animatable.View>
//         )}

//         {/* AI SUGGESTS SECTION */}
//         {prefs.aiSuggestions &&
//           typeof weather?.fahrenheit?.main?.temp === 'number' && (
//             <AiStylistSuggestions
//               theme={theme}
//               weather={weather}
//               globalStyles={globalStyles}
//               navigate={navigate}
//               wardrobe={wardrobe}
//             />
//           )}

//         {/* Map Section — collapsible with animated height & fade */}
//         {prefs.locationMap && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={300}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               <Text style={globalStyles.sectionTitle}>Current Location</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: 10,
//                   paddingVertical: 6,
//                   borderRadius: 20,
//                   backgroundColor: theme.colors.surface3,
//                   borderWidth: tokens.borderWidth.sm,
//                   borderColor: theme.colors.surfaceBorder,
//                 }}>
//                 <View
//                   style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                       fontSize: 13,
//                     }}>
//                     {mapOpen ? 'Close' : 'Open'}
//                   </Text>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={18}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 marginTop: 8,
//                 height: mapHeight,
//                 opacity: mapOpacity,
//                 overflow: 'hidden',
//               }}>
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     padding: 1,
//                     borderColor: theme.colors.surfaceBorder,
//                     overflow: 'hidden',
//                   },
//                 ]}>
//                 <LiveLocationMap
//                   height={220}
//                   useCustomPin={false}
//                   postHeartbeat={false}
//                 />
//               </View>
//             </Animated.View>
//           </Animatable.View>
//         )}

//         {/* Quick Access Section */}
//         {prefs.quickAccess && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={500}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.centeredSection}>
//             <View style={globalStyles.section}>
//               <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//               <View style={[globalStyles.centeredSection]}>
//                 <View
//                   style={[
//                     globalStyles.cardStyles1,
//                     {
//                       padding: 10,
//                       justifyContent: 'center',
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       width: '100%',
//                     },
//                   ]}>
//                   {[
//                     {label: 'Style Me', screen: 'Outfit'},
//                     {label: 'Wardrobe', screen: 'Wardrobe'},
//                     {label: 'Add Clothes', screen: 'AddItem'},
//                     {label: 'Profile', screen: 'Profile'},
//                   ].map((btn, idx) => (
//                     <Animatable.View
//                       key={btn.screen}
//                       animation="zoomIn"
//                       delay={600 + idx * 100}
//                       duration={500}
//                       useNativeDriver
//                       style={styles.quickAccessItem}>
//                       <AppleTouchFeedback
//                         style={[globalStyles.buttonPrimary, {width: 160}]}
//                         hapticStyle="impactHeavy"
//                         onPress={() => navigate(btn.screen)}>
//                         <Text style={globalStyles.buttonPrimaryText}>
//                           {btn.label}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Top Fashion Stories / News Carousel */}
//         {prefs.topFashionStories && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={600}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//             <NewsCarousel onOpenArticle={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Discover / Recommended Items */}
//         {prefs.recommendedItems && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={700}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//             <DiscoverCarousel onOpenItem={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={800}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.sectionScroll}>
//             <View style={{flexDirection: 'row'}}>
//               <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//             </View>

//             {savedLooks.length === 0 ? (
//               <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                 <Text style={globalStyles.missingDataMessage1}>
//                   No saved looks.
//                 </Text>
//                 <TooltipBubble
//                   message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                   position="top"
//                 />
//               </View>
//             ) : (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={{paddingRight: 8}}>
//                 {savedLooks.map((look, index) => (
//                   <Animatable.View
//                     key={look.id}
//                     animation="fadeInUp"
//                     delay={900 + index * 100}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         setSelectedLook(look);
//                         setPreviewVisible(true);
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <View>
//                         <Image
//                           source={{uri: look.image_url}}
//                           style={[
//                             globalStyles.image4,
//                             {
//                               borderColor: theme.colors.surfaceBorder,
//                               borderWidth: tokens.borderWidth.md,
//                               borderRadius: tokens.borderRadius.md,
//                             },
//                           ]}
//                           resizeMode="cover"
//                         />
//                       </View>
//                       <Text
//                         style={[globalStyles.label, {marginTop: 6}]}
//                         numberOfLines={1}>
//                         {look.name}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             )}
//           </Animatable.View>
//         )}

//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={1000}
//             duration={700}
//             useNativeDriver
//             style={{alignItems: 'center', marginVertical: 16}}>
//             <AppleTouchFeedback
//               style={[globalStyles.buttonPrimary, {width: 125}]}
//               hapticStyle="impactHeavy"
//               onPress={() => setSaveModalVisible(true)}>
//               <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         )}

//         <SaveLookModal
//           visible={saveModalVisible}
//           onClose={() => setSaveModalVisible(false)}
//         />
//         <SavedLookPreviewModal
//           visible={previewVisible}
//           look={selectedLook}
//           onClose={() => setPreviewVisible(false)}
//         />
//         <ReaderModal
//           visible={readerVisible}
//           url={readerUrl}
//           title={readerTitle}
//           onClose={() => setReaderVisible(false)}
//         />
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

/////////////////////

// import React, {useEffect, useState, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AiStylistSuggestions from '../components/AiStylistSuggestions/AiStylistSuggestions';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
//     },
//     weatherAdvice: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: '#ffd369',
//       marginTop: 4,
//       lineHeight: 22,
//       paddingRight: 14,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <View style={{flex: 1}}>
//       <Animated.ScrollView
//         style={[globalStyles.screen]}
//         contentContainerStyle={globalStyles.container}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {
//             useNativeDriver: true,
//           },
//         )}>
//         {/* Header Row: Greeting + Menu */}
//         <Animatable.View
//           animation="fadeInDown"
//           duration={600}
//           delay={100}
//           useNativeDriver
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             marginBottom: 6,
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: 17,
//               fontWeight: '800',
//               color: theme.colors.foreground,
//             }}
//             numberOfLines={1}
//             ellipsizeMode="tail">
//             {firstName
//               ? `Hey ${firstName}, Ready to Get Styled Today?`
//               : 'Hey there, ready to get styled today?'}
//           </Text>

//           <AppleTouchFeedback
//             onPress={() => navigate('Settings')}
//             hapticStyle="impactLight"
//             style={{padding: 6, marginLeft: 10}}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* Video Banner with ambient parallax + reveal */}
//         <View style={globalStyles.section}>
//           <Animated.View
//             style={{
//               overflow: 'hidden',
//               shadowOffset: {width: 0, height: 6},
//               shadowOpacity: 0.1,
//               shadowRadius: 12,
//               elevation: 5,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.surfaceBorder,
//               borderRadius: tokens.borderRadius.xl,
//               backgroundColor: theme.colors.surface,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -10],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//                 {
//                   scale: scrollY.interpolate({
//                     inputRange: [-50, 0, 100],
//                     outputRange: [1.05, 1, 0.97],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Video
//               source={require('../assets/images/free4.mp4')}
//               style={{width: '100%', height: 200}}
//               muted
//               repeat
//               resizeMode="cover"
//               rate={1.0}
//               ignoreSilentSwitch="obey"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: 12,
//                 borderRadius: 16,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//                 Discover Your Signature Look
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={400}
//                 style={[
//                   styles.bannerSubtext,
//                   {color: theme.colors.buttonText1},
//                 ]}>
//                 Curated just for you this season.
//               </Animatable.Text>
//             </Animated.View>
//           </Animated.View>
//         </View>

//         {/* Weather Section */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>
//             {weather && (
//               <View style={[globalStyles.cardStyles1]}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   duration={600}
//                   delay={100}
//                   useNativeDriver
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.weatherCity}>
//                       {weather.celsius.name}
//                     </Text>

//                     <Text style={styles.weatherDesc}>
//                       {weather.celsius.weather[0].description.replace(
//                         /\b\w/g,
//                         c => c.toUpperCase(),
//                       )}
//                     </Text>

//                     {/* <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {(() => {
//                         const temp = weather.fahrenheit.main.temp;
//                         const condition = weather.celsius.weather[0].main;

//                         if (temp < 40)
//                           return 'Very cold — bundle up with layers and a coat.';
//                         if (temp < 50)
//                           return 'Chilly — layer a knit or light jacket.';
//                         if (temp < 65)
//                           return 'Mild and comfortable — a shirt and light layer work perfectly.';
//                         if (temp < 80)
//                           return 'Warm — opt for breathable fabrics.';
//                         if (temp < 90) return 'Hot — keep it light and airy.';
//                         return 'Scorching — wear ultra-light pieces and stay hydrated.';
//                       })()}{' '}
//                       {(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain')
//                           return '☔ Grab an umbrella or waterproof layer.';
//                         if (condition === 'Snow')
//                           return '❄️ Insulated footwear and layers recommended.';
//                         if (condition === 'Clear')
//                           return '😎 Sunglasses might come in handy.';
//                         if (condition === 'Clouds')
//                           return '☁️ Great day for layering neutrals.';
//                         return '';
//                       })()}
//                     </Text> */}
//                     <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {(() => {
//                         const temp = weather.fahrenheit.main.temp;
//                         const condition = weather.celsius.weather[0].main;

//                         if (temp < 40) return 'Very cold';
//                         if (temp < 50) return 'Chilly';
//                         if (temp < 65) return 'Mild and comfortable';
//                         if (temp < 80) return 'Warm';
//                         if (temp < 90) return 'Hot';
//                         return 'Scorching';
//                       })()}{' '}
//                       {/* {(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain')
//                           return '☔ Grab an umbrella or waterproof layer.';
//                         if (condition === 'Snow')
//                           return '❄️ Insulated footwear and layers recommended.';
//                         if (condition === 'Clear')
//                           return '😎 Sunglasses might come in handy.';
//                         if (condition === 'Clouds')
//                           return '☁️ Great day for layering neutrals.';
//                         return '';
//                       })()} */}
//                     </Text>
//                   </View>

//                   <View style={styles.weatherTempContainer}>
//                     <Text style={styles.weatherTemp}>
//                       {Math.round(weather.fahrenheit.main.temp)}° F
//                     </Text>
//                   </View>
//                 </Animatable.View>
//               </View>
//             )}
//           </Animatable.View>
//         )}

//         {/* Smart AI Nudge */}
//         {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={400}
//             duration={800}
//             useNativeDriver
//             style={{
//               marginHorizontal: 16,
//               marginBottom: 20,
//               backgroundColor: theme.colors.surface,
//               borderRadius: 16,
//               padding: 16,
//               shadowColor: '#000',
//               shadowOpacity: 0.08,
//               shadowRadius: 6,
//               elevation: 3,
//             }}>
//             <Text
//               style={{
//                 fontSize: 15,
//                 fontWeight: '600',
//                 color: '#ffd369',
//                 fontStyle: 'italic',
//               }}>
//               🧥 It might rain later — consider a jacket with your look.
//             </Text>
//           </Animatable.View>
//         )}

//         {/* AI SUGGESTS SECTION */}
//         {prefs.aiSuggestions &&
//           typeof weather?.fahrenheit?.main?.temp === 'number' && (
//             <AiStylistSuggestions
//               theme={theme}
//               weather={weather}
//               globalStyles={globalStyles}
//               navigate={navigate}
//               wardrobe={wardrobe}
//             />
//           )}

//         {/* Map Section — collapsible with animated height & fade */}
//         {prefs.locationMap && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={300}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               <Text style={globalStyles.sectionTitle}>
//                 Your Current Location
//               </Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: 10,
//                   paddingVertical: 6,
//                   borderRadius: 20,
//                   backgroundColor: theme.colors.surface3,
//                   borderWidth: tokens.borderWidth.sm,
//                   borderColor: theme.colors.surfaceBorder,
//                 }}>
//                 <View
//                   style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                       fontSize: 13,
//                     }}>
//                     {mapOpen ? 'Close' : 'Open'}
//                   </Text>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={18}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 marginTop: 8,
//                 height: mapHeight,
//                 opacity: mapOpacity,
//                 overflow: 'hidden',
//               }}>
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     padding: 1,
//                     borderColor: theme.colors.surfaceBorder,
//                     overflow: 'hidden',
//                   },
//                 ]}>
//                 <LiveLocationMap
//                   height={220}
//                   useCustomPin={false}
//                   postHeartbeat={false}
//                 />
//               </View>
//             </Animated.View>
//           </Animatable.View>
//         )}

//         {/* Quick Access Section */}
//         {prefs.quickAccess && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={500}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.centeredSection}>
//             <View style={globalStyles.section}>
//               <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//               <View style={[globalStyles.centeredSection]}>
//                 <View
//                   style={[
//                     globalStyles.cardStyles1,
//                     {
//                       padding: 10,
//                       justifyContent: 'center',
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       width: '100%',
//                     },
//                   ]}>
//                   {[
//                     {label: 'Style Me', screen: 'Outfit'},
//                     {label: 'Wardrobe', screen: 'Wardrobe'},
//                     {label: 'Add Clothes', screen: 'AddItem'},
//                     {label: 'Profile', screen: 'Profile'},
//                   ].map((btn, idx) => (
//                     <Animatable.View
//                       key={btn.screen}
//                       animation="zoomIn"
//                       delay={600 + idx * 100}
//                       duration={500}
//                       useNativeDriver
//                       style={styles.quickAccessItem}>
//                       <AppleTouchFeedback
//                         style={[globalStyles.buttonPrimary, {width: 160}]}
//                         hapticStyle="impactHeavy"
//                         onPress={() => navigate(btn.screen)}>
//                         <Text style={globalStyles.buttonPrimaryText}>
//                           {btn.label}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Top Fashion Stories / News Carousel */}
//         {prefs.topFashionStories && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={600}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//             <NewsCarousel onOpenArticle={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Discover / Recommended Items */}
//         {prefs.recommendedItems && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={700}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//             <DiscoverCarousel onOpenItem={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={800}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.sectionScroll}>
//             <View style={{flexDirection: 'row'}}>
//               <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//             </View>

//             {savedLooks.length === 0 ? (
//               <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                 <Text style={globalStyles.missingDataMessage1}>
//                   No saved looks.
//                 </Text>
//                 <TooltipBubble
//                   message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                   position="top"
//                 />
//               </View>
//             ) : (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={{paddingRight: 8}}>
//                 {savedLooks.map((look, index) => (
//                   <Animatable.View
//                     key={look.id}
//                     animation="fadeInUp"
//                     delay={900 + index * 100}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         setSelectedLook(look);
//                         setPreviewVisible(true);
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <View>
//                         <Image
//                           source={{uri: look.image_url}}
//                           style={[
//                             globalStyles.image4,
//                             {
//                               borderColor: theme.colors.surfaceBorder,
//                               borderWidth: tokens.borderWidth.md,
//                               borderRadius: tokens.borderRadius.md,
//                             },
//                           ]}
//                           resizeMode="cover"
//                         />
//                       </View>
//                       <Text
//                         style={[globalStyles.label, {marginTop: 6}]}
//                         numberOfLines={1}>
//                         {look.name}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             )}
//           </Animatable.View>
//         )}

//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={1000}
//             duration={700}
//             useNativeDriver
//             style={{alignItems: 'center', marginVertical: 16}}>
//             <AppleTouchFeedback
//               style={[globalStyles.buttonPrimary, {width: 125}]}
//               hapticStyle="impactHeavy"
//               onPress={() => setSaveModalVisible(true)}>
//               <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         )}

//         <SaveLookModal
//           visible={saveModalVisible}
//           onClose={() => setSaveModalVisible(false)}
//         />
//         <SavedLookPreviewModal
//           visible={previewVisible}
//           look={selectedLook}
//           onClose={() => setPreviewVisible(false)}
//         />
//         <ReaderModal
//           visible={readerVisible}
//           url={readerUrl}
//           title={readerTitle}
//           onClose={() => setReaderVisible(false)}
//         />
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

/////////////////////

// GRADIENT VERSION BELOW

// import React, {useEffect, useState, useMemo, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AiStylistSuggestions from '../components/AiStylistSuggestions/AiStylistSuggestions';
// import {Surface} from '../components/Surface/Surface';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <View style={{flex: 1}}>
//       <Animated.ScrollView
//         style={[globalStyles.screen]}
//         contentContainerStyle={globalStyles.container}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {
//             useNativeDriver: true,
//           },
//         )}>
//         {/* Header Row: Greeting + Menu */}
//         <Animatable.View
//           animation="fadeInDown"
//           duration={600}
//           delay={100}
//           useNativeDriver
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             marginBottom: 6,
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: 17,
//               fontWeight: '800',
//               color: theme.colors.foreground,
//             }}
//             numberOfLines={1}
//             ellipsizeMode="tail">
//             {firstName
//               ? `Hey ${firstName}, Ready to Get Styled Today?`
//               : 'Hey there, ready to get styled today?'}
//           </Text>

//           <AppleTouchFeedback
//             onPress={() => navigate('Settings')}
//             hapticStyle="impactLight"
//             style={{padding: 6, marginLeft: 10}}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* Video Banner with ambient parallax + reveal */}
//         <View style={globalStyles.section}>
//           <Animated.View
//             style={{
//               overflow: 'hidden',
//               shadowOffset: {width: 0, height: 6},
//               shadowOpacity: 0.1,
//               shadowRadius: 12,
//               elevation: 5,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.surfaceBorder,
//               borderRadius: tokens.borderRadius.xl,
//               backgroundColor: theme.colors.surface,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -10],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//                 {
//                   scale: scrollY.interpolate({
//                     inputRange: [-50, 0, 100],
//                     outputRange: [1.05, 1, 0.97],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Video
//               source={require('../assets/images/free4.mp4')}
//               style={{width: '100%', height: 200}}
//               muted
//               repeat
//               resizeMode="cover"
//               rate={1.0}
//               ignoreSilentSwitch="obey"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: 12,
//                 borderRadius: 16,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//                 Discover Your Signature Look
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={400}
//                 style={[
//                   styles.bannerSubtext,
//                   {color: theme.colors.buttonText1},
//                 ]}>
//                 Curated just for you this season.
//               </Animatable.Text>
//             </Animated.View>
//           </Animated.View>
//         </View>

//         {/* Weather Section */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>
//             {weather && (
//               <View style={globalStyles.cardStyles1}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   duration={600}
//                   delay={100}
//                   useNativeDriver
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.weatherCity}>
//                       {weather.celsius.name}
//                     </Text>
//                     <Text style={styles.weatherDesc}>
//                       {weather.celsius.weather[0].description}
//                     </Text>
//                     <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {weather.fahrenheit.main.temp < 50
//                         ? 'It’s chilly — layer up.'
//                         : weather.fahrenheit.main.temp > 85
//                         ? 'Hot day — keep it light.'
//                         : 'Perfect weather — dress freely.'}
//                     </Text>
//                   </View>
//                   <View style={styles.weatherTempContainer}>
//                     <Text style={styles.weatherTemp}>
//                       {Math.round(weather.fahrenheit.main.temp)}° F
//                     </Text>
//                   </View>
//                 </Animatable.View>
//               </View>
//             )}
//           </Animatable.View>
//         )}

//         {/* Smart AI Nudge */}
//         {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={400}
//             duration={800}
//             useNativeDriver
//             style={{
//               marginHorizontal: 16,
//               marginBottom: 20,
//               backgroundColor: theme.colors.surface,
//               borderRadius: 16,
//               padding: 16,
//               shadowColor: '#000',
//               shadowOpacity: 0.08,
//               shadowRadius: 6,
//               elevation: 3,
//             }}>
//             <Text
//               style={{
//                 fontSize: 15,
//                 fontWeight: '600',
//                 color: '#ffd369',
//                 fontStyle: 'italic',
//               }}>
//               🧥 It might rain later — consider a jacket with your look.
//             </Text>
//           </Animatable.View>
//         )}

//         {/* Map Section — collapsible with animated height & fade */}
//         {prefs.locationMap && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={300}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               <Text style={globalStyles.sectionTitle}>
//                 Your Current Location
//               </Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: 10,
//                   paddingVertical: 6,
//                   borderRadius: 20,
//                   backgroundColor: theme.colors.surface3,
//                   borderWidth: tokens.borderWidth.sm,
//                   borderColor: theme.colors.surfaceBorder,
//                 }}>
//                 <View
//                   style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                       fontSize: 13,
//                     }}>
//                     {mapOpen ? 'Close' : 'Open'}
//                   </Text>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={18}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 marginTop: 8,
//                 height: mapHeight,
//                 opacity: mapOpacity,
//                 overflow: 'hidden',
//               }}>
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     padding: 1,
//                     borderColor: theme.colors.surfaceBorder,
//                     overflow: 'hidden',
//                   },
//                 ]}>
//                 <LiveLocationMap
//                   height={220}
//                   useCustomPin={false}
//                   postHeartbeat={false}
//                 />
//               </View>
//             </Animated.View>
//           </Animatable.View>
//         )}

//         {/* {prefs.aiSuggestions &&
//           typeof weather?.fahrenheit?.main?.temp === 'number' && (
//             <AiStylistSuggestions
//               theme={theme}
//               weather={weather}
//               globalStyles={globalStyles}
//               navigate={navigate}
//               wardrobe={wardrobe}
//             />
//           )} */}

//         {/* Quick Access Section */}
//         {/* {prefs.quickAccess && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={500}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.centeredSection}>
//             <View style={globalStyles.section}>
//               <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//               <View style={[globalStyles.centeredSection]}>
//                 <View
//                   style={[
//                     globalStyles.cardStyles1,
//                     {
//                       padding: 10,
//                       justifyContent: 'center',
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       width: '100%',
//                     },
//                   ]}>
//                   {[
//                     {label: 'Style Me', screen: 'Outfit'},
//                     {label: 'Wardrobe', screen: 'Wardrobe'},
//                     {label: 'Add Clothes', screen: 'AddItem'},
//                     {label: 'Profile', screen: 'Profile'},
//                   ].map((btn, idx) => (
//                     <Animatable.View
//                       key={btn.screen}
//                       animation="zoomIn"
//                       delay={600 + idx * 100}
//                       duration={500}
//                       useNativeDriver
//                       style={styles.quickAccessItem}>
//                       <AppleTouchFeedback
//                         style={[globalStyles.buttonPrimary, {width: 160}]}
//                         hapticStyle="impactHeavy"
//                         onPress={() => navigate(btn.screen)}>
//                         <Text style={globalStyles.buttonPrimaryText}>
//                           {btn.label}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )} */}
//         {/* Quick Access Section */}
//         {prefs.quickAccess && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={500}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.centeredSection}>
//             <View style={globalStyles.section}>
//               <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//               <View style={[globalStyles.centeredSection]}>
//                 <Surface
//                   style={[
//                     globalStyles.cardStyles1,
//                     {
//                       padding: 10,
//                       justifyContent: 'center',
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       width: '100%',
//                       borderRadius: tokens.borderRadius.lg,
//                       overflow: 'hidden',
//                     },
//                   ]}>
//                   {[
//                     {label: 'Style Me', screen: 'Outfit'},
//                     {label: 'Wardrobe', screen: 'Wardrobe'},
//                     {label: 'Add Clothes', screen: 'AddItem'},
//                     {label: 'Profile', screen: 'Profile'},
//                   ].map((btn, idx) => (
//                     <Animatable.View
//                       key={btn.screen}
//                       animation="zoomIn"
//                       delay={600 + idx * 100}
//                       duration={500}
//                       useNativeDriver
//                       style={styles.quickAccessItem}>
//                       <AppleTouchFeedback
//                         style={[globalStyles.buttonPrimary, {width: 160}]}
//                         hapticStyle="impactHeavy"
//                         onPress={() => navigate(btn.screen)}>
//                         <Text style={globalStyles.buttonPrimaryText}>
//                           {btn.label}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </Surface>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Top Fashion Stories / News Carousel */}
//         {prefs.topFashionStories && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={600}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//             <NewsCarousel onOpenArticle={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Discover / Recommended Items */}
//         {prefs.recommendedItems && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={700}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//             <DiscoverCarousel onOpenItem={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={800}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.sectionScroll}>
//             <View style={{flexDirection: 'row'}}>
//               <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//             </View>

//             {savedLooks.length === 0 ? (
//               <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                 <Text style={globalStyles.missingDataMessage1}>
//                   No saved looks.
//                 </Text>
//                 <TooltipBubble
//                   message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                   position="top"
//                 />
//               </View>
//             ) : (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={{paddingRight: 8}}>
//                 {savedLooks.map((look, index) => (
//                   <Animatable.View
//                     key={look.id}
//                     animation="fadeInUp"
//                     delay={900 + index * 100}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         setSelectedLook(look);
//                         setPreviewVisible(true);
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <View>
//                         <Image
//                           source={{uri: look.image_url}}
//                           style={[
//                             globalStyles.image4,
//                             {
//                               borderColor: theme.colors.surfaceBorder,
//                               borderWidth: tokens.borderWidth.md,
//                               borderRadius: tokens.borderRadius.md,
//                             },
//                           ]}
//                           resizeMode="cover"
//                         />
//                       </View>
//                       <Text
//                         style={[globalStyles.label, {marginTop: 6}]}
//                         numberOfLines={1}>
//                         {look.name}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             )}
//           </Animatable.View>
//         )}

//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={1000}
//             duration={700}
//             useNativeDriver
//             style={{alignItems: 'center', marginVertical: 16}}>
//             <AppleTouchFeedback
//               style={[globalStyles.buttonPrimary, {width: 125}]}
//               hapticStyle="impactHeavy"
//               onPress={() => setSaveModalVisible(true)}>
//               <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         )}

//         <SaveLookModal
//           visible={saveModalVisible}
//           onClose={() => setSaveModalVisible(false)}
//         />
//         <SavedLookPreviewModal
//           visible={previewVisible}
//           look={selectedLook}
//           onClose={() => setPreviewVisible(false)}
//         />
//         <ReaderModal
//           visible={readerVisible}
//           url={readerUrl}
//           title={readerTitle}
//           onClose={() => setReaderVisible(false)}
//         />
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

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
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AiStylistSuggestions from '../components/AiStylistSuggestions/AiStylistSuggestions';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <View style={{flex: 1}}>
//       <Animated.ScrollView
//         style={[globalStyles.screen]}
//         contentContainerStyle={globalStyles.container}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {
//             useNativeDriver: true,
//           },
//         )}>
//         {/* Header Row: Greeting + Menu */}
//         <Animatable.View
//           animation="fadeInDown"
//           duration={600}
//           delay={100}
//           useNativeDriver
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             marginBottom: 6,
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: 17,
//               fontWeight: '800',
//               color: theme.colors.foreground,
//             }}
//             numberOfLines={1}
//             ellipsizeMode="tail">
//             {firstName
//               ? `Hey ${firstName}, Ready to Get Styled Today?`
//               : 'Hey there, ready to get styled today?'}
//           </Text>

//           <AppleTouchFeedback
//             onPress={() => navigate('Settings')}
//             hapticStyle="impactLight"
//             style={{padding: 6, marginLeft: 10}}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* Video Banner with ambient parallax + reveal */}
//         <View style={globalStyles.section}>
//           <Animated.View
//             style={{
//               overflow: 'hidden',
//               shadowOffset: {width: 0, height: 6},
//               shadowOpacity: 0.1,
//               shadowRadius: 12,
//               elevation: 5,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.surfaceBorder,
//               borderRadius: tokens.borderRadius.xl,
//               backgroundColor: theme.colors.surface,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -10],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//                 {
//                   scale: scrollY.interpolate({
//                     inputRange: [-50, 0, 100],
//                     outputRange: [1.05, 1, 0.97],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Video
//               source={require('../assets/images/free4.mp4')}
//               style={{width: '100%', height: 200}}
//               muted
//               repeat
//               resizeMode="cover"
//               rate={1.0}
//               ignoreSilentSwitch="obey"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: 12,
//                 borderRadius: 16,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//                 Discover Your Signature Look
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={400}
//                 style={[
//                   styles.bannerSubtext,
//                   {color: theme.colors.buttonText1},
//                 ]}>
//                 Curated just for you this season.
//               </Animatable.Text>
//             </Animated.View>
//           </Animated.View>
//         </View>

//         {/* 🧠 AI Stylist Assistant Section */}
//         {/* <AiStylistSuggestions
//           theme={theme}
//           weather={weather}
//           globalStyles={globalStyles}
//           navigate={navigate}
//         /> */}

//         {/* 🧠 AI Stylist Assistant Section */}
//         {weather?.fahrenheit?.main?.temp && (
//           <AiStylistSuggestions
//             theme={theme}
//             weather={weather}
//             globalStyles={globalStyles}
//             navigate={navigate}
//           />
//         )}

//         {/* Weather Section */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>
//             {weather && (
//               <View style={globalStyles.cardStyles1}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   duration={600}
//                   delay={100}
//                   useNativeDriver
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.weatherCity}>
//                       {weather.celsius.name}
//                     </Text>
//                     <Text style={styles.weatherDesc}>
//                       {weather.celsius.weather[0].description}
//                     </Text>
//                     <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {weather.fahrenheit.main.temp < 50
//                         ? 'It’s chilly — layer up.'
//                         : weather.fahrenheit.main.temp > 85
//                         ? 'Hot day — keep it light.'
//                         : 'Perfect weather — dress freely.'}
//                     </Text>
//                   </View>
//                   <View style={styles.weatherTempContainer}>
//                     <Text style={styles.weatherTemp}>
//                       {Math.round(weather.fahrenheit.main.temp)}° F
//                     </Text>
//                   </View>
//                 </Animatable.View>
//               </View>
//             )}
//           </Animatable.View>
//         )}

//         {/* Smart AI Nudge */}
//         {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={400}
//             duration={800}
//             useNativeDriver
//             style={{
//               marginHorizontal: 16,
//               marginBottom: 20,
//               backgroundColor: theme.colors.surface,
//               borderRadius: 16,
//               padding: 16,
//               shadowColor: '#000',
//               shadowOpacity: 0.08,
//               shadowRadius: 6,
//               elevation: 3,
//             }}>
//             <Text
//               style={{
//                 fontSize: 15,
//                 fontWeight: '600',
//                 color: '#ffd369',
//                 fontStyle: 'italic',
//               }}>
//               🧥 It might rain later — consider a jacket with your look.
//             </Text>
//           </Animatable.View>
//         )}

//         {/* Map Section — collapsible with animated height & fade */}
//         {prefs.locationMap && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={300}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               <Text style={globalStyles.sectionTitle}>
//                 Your Current Location
//               </Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: 10,
//                   paddingVertical: 6,
//                   borderRadius: 20,
//                   backgroundColor: theme.colors.surface3,
//                   borderWidth: tokens.borderWidth.sm,
//                   borderColor: theme.colors.surfaceBorder,
//                 }}>
//                 <View
//                   style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                       fontSize: 13,
//                     }}>
//                     {mapOpen ? 'Close' : 'Open'}
//                   </Text>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={18}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 marginTop: 8,
//                 height: mapHeight,
//                 opacity: mapOpacity,
//                 overflow: 'hidden',
//               }}>
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     padding: 1,
//                     borderColor: theme.colors.surfaceBorder,
//                     overflow: 'hidden',
//                   },
//                 ]}>
//                 <LiveLocationMap
//                   height={220}
//                   useCustomPin={false}
//                   postHeartbeat={false}
//                 />
//               </View>
//             </Animated.View>
//           </Animatable.View>
//         )}

//         {/* Quick Access Section */}
//         {prefs.quickAccess && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={500}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.centeredSection}>
//             <View style={globalStyles.section}>
//               <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//               <View style={[globalStyles.centeredSection]}>
//                 <View
//                   style={[
//                     globalStyles.cardStyles1,
//                     {
//                       padding: 10,
//                       justifyContent: 'center',
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       width: '100%',
//                     },
//                   ]}>
//                   {[
//                     {label: 'Style Me', screen: 'Outfit'},
//                     {label: 'Wardrobe', screen: 'Wardrobe'},
//                     {label: 'Add Clothes', screen: 'AddItem'},
//                     {label: 'Profile', screen: 'Profile'},
//                   ].map((btn, idx) => (
//                     <Animatable.View
//                       key={btn.screen}
//                       animation="zoomIn"
//                       delay={600 + idx * 100}
//                       duration={500}
//                       useNativeDriver
//                       style={styles.quickAccessItem}>
//                       <AppleTouchFeedback
//                         style={[globalStyles.buttonPrimary, {width: 160}]}
//                         hapticStyle="impactHeavy"
//                         onPress={() => navigate(btn.screen)}>
//                         <Text style={globalStyles.buttonPrimaryText}>
//                           {btn.label}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Top Fashion Stories / News Carousel */}
//         {prefs.topFashionStories && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={600}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//             <NewsCarousel onOpenArticle={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Discover / Recommended Items */}
//         {prefs.recommendedItems && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={700}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//             <DiscoverCarousel onOpenItem={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={800}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.sectionScroll}>
//             <View style={{flexDirection: 'row'}}>
//               <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//             </View>

//             {savedLooks.length === 0 ? (
//               <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                 <Text style={globalStyles.missingDataMessage1}>
//                   No saved looks.
//                 </Text>
//                 <TooltipBubble
//                   message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                   position="top"
//                 />
//               </View>
//             ) : (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={{paddingRight: 8}}>
//                 {savedLooks.map((look, index) => (
//                   <Animatable.View
//                     key={look.id}
//                     animation="fadeInUp"
//                     delay={900 + index * 100}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         setSelectedLook(look);
//                         setPreviewVisible(true);
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <View>
//                         <Image
//                           source={{uri: look.image_url}}
//                           style={[
//                             globalStyles.image4,
//                             {
//                               borderColor: theme.colors.surfaceBorder,
//                               borderWidth: tokens.borderWidth.md,
//                               borderRadius: tokens.borderRadius.md,
//                             },
//                           ]}
//                           resizeMode="cover"
//                         />
//                       </View>
//                       <Text
//                         style={[globalStyles.label, {marginTop: 6}]}
//                         numberOfLines={1}>
//                         {look.name}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             )}
//           </Animatable.View>
//         )}

//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={1000}
//             duration={700}
//             useNativeDriver
//             style={{alignItems: 'center', marginVertical: 16}}>
//             <AppleTouchFeedback
//               style={[globalStyles.buttonPrimary, {width: 125}]}
//               hapticStyle="impactHeavy"
//               onPress={() => setSaveModalVisible(true)}>
//               <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         )}

//         <SaveLookModal
//           visible={saveModalVisible}
//           onClose={() => setSaveModalVisible(false)}
//         />
//         <SavedLookPreviewModal
//           visible={previewVisible}
//           look={selectedLook}
//           onClose={() => setPreviewVisible(false)}
//         />
//         <ReaderModal
//           visible={readerVisible}
//           url={readerUrl}
//           title={readerTitle}
//           onClose={() => setReaderVisible(false)}
//         />
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

////////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AiStylistSuggestions from '../components/AiStylistSuggestions/AiStylistSuggestions';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <View style={{flex: 1}}>
//       <Animated.ScrollView
//         style={[globalStyles.screen]}
//         contentContainerStyle={globalStyles.container}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {
//             useNativeDriver: true,
//           },
//         )}>
//         {/* Header Row: Greeting + Menu */}
//         <Animatable.View
//           animation="fadeInDown"
//           duration={600}
//           delay={100}
//           useNativeDriver
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             marginBottom: 6,
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: 17,
//               fontWeight: '800',
//               color: theme.colors.foreground,
//             }}
//             numberOfLines={1}
//             ellipsizeMode="tail">
//             {firstName
//               ? `Hey ${firstName}, Ready to Get Styled Today?`
//               : 'Hey there, ready to get styled today?'}
//           </Text>

//           <AppleTouchFeedback
//             onPress={() => navigate('Settings')}
//             hapticStyle="impactLight"
//             style={{padding: 6, marginLeft: 10}}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* Video Banner with ambient parallax + reveal */}
//         <View style={globalStyles.section}>
//           <Animated.View
//             style={{
//               overflow: 'hidden',
//               shadowOffset: {width: 0, height: 6},
//               shadowOpacity: 0.1,
//               shadowRadius: 12,
//               elevation: 5,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.surfaceBorder,
//               borderRadius: tokens.borderRadius.xl,
//               backgroundColor: theme.colors.surface,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -10],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//                 {
//                   scale: scrollY.interpolate({
//                     inputRange: [-50, 0, 100],
//                     outputRange: [1.05, 1, 0.97],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Video
//               source={require('../assets/images/free4.mp4')}
//               style={{width: '100%', height: 200}}
//               muted
//               repeat
//               resizeMode="cover"
//               rate={1.0}
//               ignoreSilentSwitch="obey"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: 12,
//                 borderRadius: 16,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//                 Discover Your Signature Look
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={400}
//                 style={[
//                   styles.bannerSubtext,
//                   {color: theme.colors.buttonText1},
//                 ]}>
//                 Curated just for you this season.
//               </Animatable.Text>
//             </Animated.View>
//           </Animated.View>
//         </View>

//         {/* 🧠 AI Stylist Assistant Section */}
//         <AiStylistSuggestions
//           theme={theme}
//           weather={weather}
//           globalStyles={globalStyles}
//           navigate={navigate}
//         />

//         {/* Weather Section */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>
//             {weather && (
//               <View style={globalStyles.cardStyles1}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   duration={600}
//                   delay={100}
//                   useNativeDriver
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.weatherCity}>
//                       {weather.celsius.name}
//                     </Text>
//                     <Text style={styles.weatherDesc}>
//                       {weather.celsius.weather[0].description}
//                     </Text>
//                     <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {weather.fahrenheit.main.temp < 50
//                         ? 'It’s chilly — layer up.'
//                         : weather.fahrenheit.main.temp > 85
//                         ? 'Hot day — keep it light.'
//                         : 'Perfect weather — dress freely.'}
//                     </Text>
//                   </View>
//                   <View style={styles.weatherTempContainer}>
//                     <Text style={styles.weatherTemp}>
//                       {Math.round(weather.fahrenheit.main.temp)}° F
//                     </Text>
//                   </View>
//                 </Animatable.View>
//               </View>
//             )}
//           </Animatable.View>
//         )}

//         {/* Smart AI Nudge */}
//         {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={400}
//             duration={800}
//             useNativeDriver
//             style={{
//               marginHorizontal: 16,
//               marginBottom: 20,
//               backgroundColor: theme.colors.surface,
//               borderRadius: 16,
//               padding: 16,
//               shadowColor: '#000',
//               shadowOpacity: 0.08,
//               shadowRadius: 6,
//               elevation: 3,
//             }}>
//             <Text
//               style={{
//                 fontSize: 15,
//                 fontWeight: '600',
//                 color: '#ffd369',
//                 fontStyle: 'italic',
//               }}>
//               🧥 It might rain later — consider a jacket with your look.
//             </Text>
//           </Animatable.View>
//         )}

//         {/* Map Section — collapsible with animated height & fade */}
//         {prefs.locationMap && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={300}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               <Text style={globalStyles.sectionTitle}>
//                 Your Current Location
//               </Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: 10,
//                   paddingVertical: 6,
//                   borderRadius: 20,
//                   backgroundColor: theme.colors.surface3,
//                   borderWidth: tokens.borderWidth.sm,
//                   borderColor: theme.colors.surfaceBorder,
//                 }}>
//                 <View
//                   style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                       fontSize: 13,
//                     }}>
//                     {mapOpen ? 'Close' : 'Open'}
//                   </Text>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={18}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 marginTop: 8,
//                 height: mapHeight,
//                 opacity: mapOpacity,
//                 overflow: 'hidden',
//               }}>
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     padding: 1,
//                     borderColor: theme.colors.surfaceBorder,
//                     overflow: 'hidden',
//                   },
//                 ]}>
//                 <LiveLocationMap
//                   height={220}
//                   useCustomPin={false}
//                   postHeartbeat={false}
//                 />
//               </View>
//             </Animated.View>
//           </Animatable.View>
//         )}

//         {/* Quick Access Section */}
//         {prefs.quickAccess && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={500}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.centeredSection}>
//             <View style={globalStyles.section}>
//               <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//               <View style={[globalStyles.centeredSection]}>
//                 <View
//                   style={[
//                     globalStyles.cardStyles1,
//                     {
//                       padding: 10,
//                       justifyContent: 'center',
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       width: '100%',
//                     },
//                   ]}>
//                   {[
//                     {label: 'Style Me', screen: 'Outfit'},
//                     {label: 'Wardrobe', screen: 'Wardrobe'},
//                     {label: 'Add Clothes', screen: 'AddItem'},
//                     {label: 'Profile', screen: 'Profile'},
//                   ].map((btn, idx) => (
//                     <Animatable.View
//                       key={btn.screen}
//                       animation="zoomIn"
//                       delay={600 + idx * 100}
//                       duration={500}
//                       useNativeDriver
//                       style={styles.quickAccessItem}>
//                       <AppleTouchFeedback
//                         style={[globalStyles.buttonPrimary, {width: 160}]}
//                         hapticStyle="impactHeavy"
//                         onPress={() => navigate(btn.screen)}>
//                         <Text style={globalStyles.buttonPrimaryText}>
//                           {btn.label}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Top Fashion Stories / News Carousel */}
//         {prefs.topFashionStories && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={600}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//             <NewsCarousel onOpenArticle={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Discover / Recommended Items */}
//         {prefs.recommendedItems && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={700}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//             <DiscoverCarousel onOpenItem={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={800}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.sectionScroll}>
//             <View style={{flexDirection: 'row'}}>
//               <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//             </View>

//             {savedLooks.length === 0 ? (
//               <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                 <Text style={globalStyles.missingDataMessage1}>
//                   No saved looks.
//                 </Text>
//                 <TooltipBubble
//                   message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                   position="top"
//                 />
//               </View>
//             ) : (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={{paddingRight: 8}}>
//                 {savedLooks.map((look, index) => (
//                   <Animatable.View
//                     key={look.id}
//                     animation="fadeInUp"
//                     delay={900 + index * 100}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         setSelectedLook(look);
//                         setPreviewVisible(true);
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <View>
//                         <Image
//                           source={{uri: look.image_url}}
//                           style={[
//                             globalStyles.image4,
//                             {
//                               borderColor: theme.colors.surfaceBorder,
//                               borderWidth: tokens.borderWidth.md,
//                               borderRadius: tokens.borderRadius.md,
//                             },
//                           ]}
//                           resizeMode="cover"
//                         />
//                       </View>
//                       <Text
//                         style={[globalStyles.label, {marginTop: 6}]}
//                         numberOfLines={1}>
//                         {look.name}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             )}
//           </Animatable.View>
//         )}

//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={1000}
//             duration={700}
//             useNativeDriver
//             style={{alignItems: 'center', marginVertical: 16}}>
//             <AppleTouchFeedback
//               style={[globalStyles.buttonPrimary, {width: 125}]}
//               hapticStyle="impactHeavy"
//               onPress={() => setSaveModalVisible(true)}>
//               <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         )}

//         <SaveLookModal
//           visible={saveModalVisible}
//           onClose={() => setSaveModalVisible(false)}
//         />
//         <SavedLookPreviewModal
//           visible={previewVisible}
//           look={selectedLook}
//           onClose={() => setPreviewVisible(false)}
//         />
//         <ReaderModal
//           visible={readerVisible}
//           url={readerUrl}
//           title={readerTitle}
//           onClose={() => setReaderVisible(false)}
//         />
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

///////////////////////////////

// FULL NEW FEATURES ADDED AND WORKING BELOW

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AiStylistSuggestions from '../components/AiStylistSuggestions/AiStylistSuggestions';
// import {useVoiceControl} from '../hooks/useVoiceCommands';
// import {handleVoiceNavigation} from '../utils/voiceNavigationCommands';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   // 🎤 VOICE CONTROL HOOK
//   const {speech, startListening, stopListening, isRecording} =
//     useVoiceControl();

//   useEffect(() => {
//     if (!speech) return;
//     console.log('[🎤 Voice Command]:', speech);
//     handleVoiceNavigation(speech, navigate, scrollY, weather);
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <View style={{flex: 1}}>
//       <Animated.ScrollView
//         style={[globalStyles.screen]}
//         contentContainerStyle={globalStyles.container}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {
//             useNativeDriver: true,
//           },
//         )}>
//         {/* Header Row: Greeting + Menu */}
//         <Animatable.View
//           animation="fadeInDown"
//           duration={600}
//           delay={100}
//           useNativeDriver
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             marginBottom: 6,
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: 17,
//               fontWeight: '800',
//               color: theme.colors.foreground,
//             }}
//             numberOfLines={1}
//             ellipsizeMode="tail">
//             {firstName
//               ? `Hey ${firstName}, Ready to Get Styled Today?`
//               : 'Hey there, ready to get styled today?'}
//           </Text>

//           <AppleTouchFeedback
//             onPress={() => navigate('Settings')}
//             hapticStyle="impactLight"
//             style={{padding: 6, marginLeft: 10}}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* Video Banner with ambient parallax + reveal */}
//         <View style={globalStyles.section}>
//           <Animated.View
//             style={{
//               overflow: 'hidden',
//               shadowOffset: {width: 0, height: 6},
//               shadowOpacity: 0.1,
//               shadowRadius: 12,
//               elevation: 5,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.surfaceBorder,
//               borderRadius: tokens.borderRadius.xl,
//               backgroundColor: theme.colors.surface,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -10],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//                 {
//                   scale: scrollY.interpolate({
//                     inputRange: [-50, 0, 100],
//                     outputRange: [1.05, 1, 0.97],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Video
//               source={require('../assets/images/free4.mp4')}
//               style={{width: '100%', height: 200}}
//               muted
//               repeat
//               resizeMode="cover"
//               rate={1.0}
//               ignoreSilentSwitch="obey"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: 12,
//                 borderRadius: 16,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//                 Discover Your Signature Look
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={400}
//                 style={[
//                   styles.bannerSubtext,
//                   {color: theme.colors.buttonText1},
//                 ]}>
//                 Curated just for you this season.
//               </Animatable.Text>
//             </Animated.View>
//           </Animated.View>
//         </View>

//         {/* 🧠 AI Stylist Assistant Section */}
//         <AiStylistSuggestions
//           theme={theme}
//           weather={weather}
//           globalStyles={globalStyles}
//           navigate={navigate}
//         />

//         {/* Weather Section */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>
//             {weather && (
//               <View style={globalStyles.cardStyles1}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   duration={600}
//                   delay={100}
//                   useNativeDriver
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.weatherCity}>
//                       {weather.celsius.name}
//                     </Text>
//                     <Text style={styles.weatherDesc}>
//                       {weather.celsius.weather[0].description}
//                     </Text>
//                     <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {weather.fahrenheit.main.temp < 50
//                         ? 'It’s chilly — layer up.'
//                         : weather.fahrenheit.main.temp > 85
//                         ? 'Hot day — keep it light.'
//                         : 'Perfect weather — dress freely.'}
//                     </Text>
//                   </View>
//                   <View style={styles.weatherTempContainer}>
//                     <Text style={styles.weatherTemp}>
//                       {Math.round(weather.fahrenheit.main.temp)}° F
//                     </Text>
//                   </View>
//                 </Animatable.View>
//               </View>
//             )}
//           </Animatable.View>
//         )}

//         {/* Smart AI Nudge */}
//         {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={400}
//             duration={800}
//             useNativeDriver
//             style={{
//               marginHorizontal: 16,
//               marginBottom: 20,
//               backgroundColor: theme.colors.surface,
//               borderRadius: 16,
//               padding: 16,
//               shadowColor: '#000',
//               shadowOpacity: 0.08,
//               shadowRadius: 6,
//               elevation: 3,
//             }}>
//             <Text
//               style={{
//                 fontSize: 15,
//                 fontWeight: '600',
//                 color: '#ffd369',
//                 fontStyle: 'italic',
//               }}>
//               🧥 It might rain later — consider a jacket with your look.
//             </Text>
//           </Animatable.View>
//         )}

//         {/* Map Section — collapsible with animated height & fade */}
//         {prefs.locationMap && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={300}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//               }}>
//               <Text style={globalStyles.sectionTitle}>
//                 Your Current Location
//               </Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: 10,
//                   paddingVertical: 6,
//                   borderRadius: 20,
//                   backgroundColor: theme.colors.surface3,
//                   borderWidth: tokens.borderWidth.sm,
//                   borderColor: theme.colors.surfaceBorder,
//                 }}>
//                 <View
//                   style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                       fontSize: 13,
//                     }}>
//                     {mapOpen ? 'Close' : 'Open'}
//                   </Text>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={18}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 marginTop: 8,
//                 height: mapHeight,
//                 opacity: mapOpacity,
//                 overflow: 'hidden',
//               }}>
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     padding: 1,
//                     borderColor: theme.colors.surfaceBorder,
//                     overflow: 'hidden',
//                   },
//                 ]}>
//                 <LiveLocationMap
//                   height={220}
//                   useCustomPin={false}
//                   postHeartbeat={false}
//                 />
//               </View>
//             </Animated.View>
//           </Animatable.View>
//         )}

//         {/* Quick Access Section */}
//         {prefs.quickAccess && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={500}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.centeredSection}>
//             <View style={globalStyles.section}>
//               <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//               <View style={[globalStyles.centeredSection]}>
//                 <View
//                   style={[
//                     globalStyles.cardStyles1,
//                     {
//                       padding: 10,
//                       justifyContent: 'center',
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       width: '100%',
//                     },
//                   ]}>
//                   {[
//                     {label: 'Style Me', screen: 'Outfit'},
//                     {label: 'Wardrobe', screen: 'Wardrobe'},
//                     {label: 'Add Clothes', screen: 'AddItem'},
//                     {label: 'Profile', screen: 'Profile'},
//                   ].map((btn, idx) => (
//                     <Animatable.View
//                       key={btn.screen}
//                       animation="zoomIn"
//                       delay={600 + idx * 100}
//                       duration={500}
//                       useNativeDriver
//                       style={styles.quickAccessItem}>
//                       <AppleTouchFeedback
//                         style={[globalStyles.buttonPrimary, {width: 160}]}
//                         hapticStyle="impactHeavy"
//                         onPress={() => navigate(btn.screen)}>
//                         <Text style={globalStyles.buttonPrimaryText}>
//                           {btn.label}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Top Fashion Stories / News Carousel */}
//         {prefs.topFashionStories && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={600}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//             <NewsCarousel onOpenArticle={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Discover / Recommended Items */}
//         {prefs.recommendedItems && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={700}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//             <DiscoverCarousel onOpenItem={openArticle} />
//           </Animatable.View>
//         )}

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={800}
//             duration={700}
//             useNativeDriver
//             style={globalStyles.sectionScroll}>
//             <View style={{flexDirection: 'row'}}>
//               <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//             </View>

//             {savedLooks.length === 0 ? (
//               <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                 <Text style={globalStyles.missingDataMessage1}>
//                   No saved looks.
//                 </Text>
//                 <TooltipBubble
//                   message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                   position="top"
//                 />
//               </View>
//             ) : (
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={{paddingRight: 8}}>
//                 {savedLooks.map((look, index) => (
//                   <Animatable.View
//                     key={look.id}
//                     animation="fadeInUp"
//                     delay={900 + index * 100}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         setSelectedLook(look);
//                         setPreviewVisible(true);
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <View>
//                         <Image
//                           source={{uri: look.image_url}}
//                           style={[
//                             globalStyles.image4,
//                             {
//                               borderColor: theme.colors.surfaceBorder,
//                               borderWidth: tokens.borderWidth.md,
//                               borderRadius: tokens.borderRadius.md,
//                             },
//                           ]}
//                           resizeMode="cover"
//                         />
//                       </View>
//                       <Text
//                         style={[globalStyles.label, {marginTop: 6}]}
//                         numberOfLines={1}>
//                         {look.name}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             )}
//           </Animatable.View>
//         )}

//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={1000}
//             duration={700}
//             useNativeDriver
//             style={{alignItems: 'center', marginVertical: 16}}>
//             <AppleTouchFeedback
//               style={[globalStyles.buttonPrimary, {width: 125}]}
//               hapticStyle="impactHeavy"
//               onPress={() => setSaveModalVisible(true)}>
//               <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         )}

//         <SaveLookModal
//           visible={saveModalVisible}
//           onClose={() => setSaveModalVisible(false)}
//         />
//         <SavedLookPreviewModal
//           visible={previewVisible}
//           look={selectedLook}
//           onClose={() => setPreviewVisible(false)}
//         />
//         <ReaderModal
//           visible={readerVisible}
//           url={readerUrl}
//           title={readerTitle}
//           onClose={() => setReaderVisible(false)}
//         />
//       </Animated.ScrollView>

//       {/* 🎤 Floating Mic Button */}
//       <TouchableOpacity
//         onPress={isRecording ? stopListening : startListening}
//         style={{
//           position: 'absolute',
//           bottom: 40,
//           right: 24,
//           backgroundColor: isRecording ? '#ff4d4d' : theme.colors.button1,
//           width: 64,
//           height: 64,
//           borderRadius: 32,
//           alignItems: 'center',
//           justifyContent: 'center',
//           shadowColor: '#000',
//           shadowOpacity: 0.25,
//           shadowRadius: 6,
//           elevation: 6,
//         }}>
//         <Icon name={isRecording ? 'mic-off' : 'mic'} size={30} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// };

// export default HomeScreen;

////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AiStylistSuggestions from '../components/AiStylistSuggestions/AiStylistSuggestions';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const {speech} = useVoiceControl();
//   useEffect(() => {
//     if (speech) {
//       console.log('[HomeScreen] speech:', speech);
//     }
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <Animatable.View
//         animation="fadeInDown"
//         duration={600}
//         delay={100}
//         useNativeDriver
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Video Banner with ambient parallax + reveal */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
//             backgroundColor: theme.colors.surface,
//             transform: [
//               {
//                 translateY: scrollY.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: [0, -10],
//                   extrapolate: 'clamp',
//                 }),
//               },
//               {
//                 scale: scrollY.interpolate({
//                   inputRange: [-50, 0, 100],
//                   outputRange: [1.05, 1, 0.97],
//                   extrapolate: 'clamp',
//                 }),
//               },
//             ],
//           }}>
//           <Video
//             source={require('../assets/images/free4.mp4')}
//             style={{width: '100%', height: 200}}
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
//               style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={[styles.bannerSubtext, {color: theme.colors.buttonText1}]}>
//               Curated just for you this season.
//             </Animatable.Text>
//           </Animated.View>
//         </Animated.View>
//       </View>

//       {/* 🧠 AI Stylist Assistant Section */}
//       <AiStylistSuggestions
//         theme={theme}
//         weather={weather}
//         globalStyles={globalStyles}
//         navigate={navigate}
//       />

//       {/* Weather Section */}
//       {prefs.weather && (
//         <Animatable.View
//           animation="fadeInUp"
//           duration={700}
//           delay={200}
//           useNativeDriver
//           style={globalStyles.section}>
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
//         </Animatable.View>
//       )}

//       {/* Smart AI Nudge */}
//       {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={400}
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

//       {/* Map Section — collapsible with animated height & fade */}
//       {prefs.locationMap && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Current Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           <Animated.View
//             style={{
//               marginTop: 8,
//               height: mapHeight,
//               opacity: mapOpacity,
//               overflow: 'hidden',
//             }}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 1,
//                   borderColor: theme.colors.surfaceBorder,
//                   overflow: 'hidden',
//                 },
//               ]}>
//               <LiveLocationMap
//                 height={220}
//                 useCustomPin={false}
//                 postHeartbeat={false}
//               />
//             </View>
//           </Animated.View>
//         </Animatable.View>
//       )}

//       {/* Quick Access Section */}
//       {prefs.quickAccess && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={500}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.centeredSection}>
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
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   {label: 'Profile', screen: 'Profile'},
//                 ].map((btn, idx) => (
//                   <Animatable.View
//                     key={btn.screen}
//                     animation="zoomIn"
//                     delay={600 + idx * 100}
//                     duration={500}
//                     useNativeDriver
//                     style={styles.quickAccessItem}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary, {width: 160}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => navigate(btn.screen)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         {btn.label}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </Animatable.View>
//       )}

//       {/* Top Fashion Stories / News Carousel */}
//       {prefs.topFashionStories && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={600}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Discover / Recommended Items */}
//       {prefs.recommendedItems && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={700}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Saved Looks Section */}
//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={800}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.sectionScroll}>
//           <View style={{flexDirection: 'row'}}>
//             <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//           </View>

//           {savedLooks.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved looks.
//               </Text>
//               <TooltipBubble
//                 message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={{paddingRight: 8}}>
//               {savedLooks.map((look, index) => (
//                 <Animatable.View
//                   key={look.id}
//                   animation="fadeInUp"
//                   delay={900 + index * 100}
//                   useNativeDriver
//                   style={globalStyles.outfitCard}>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           )}
//         </Animatable.View>
//       )}

//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1000}
//           duration={700}
//           useNativeDriver
//           style={{alignItems: 'center', marginVertical: 16}}>
//           <AppleTouchFeedback
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
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
//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

///////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// // import {useVoiceControl} from '../hooks/useVoiceControl';
// import {useVoiceControl} from '../hooks/useVoiceCommands';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import Tts from 'react-native-tts';
// import {handleVoiceNavigation} from '../utils/voiceNavigationCommands';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   // 🎤 VOICE CONTROL HOOK
//   const {speech, startListening, stopListening, isRecording} =
//     useVoiceControl();

//   useEffect(() => {
//     if (!speech) return;
//     console.log('[🎤 Voice Command]:', speech);
//     handleVoiceNavigation(speech, navigate, scrollY, weather);
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <View style={{flex: 1}}>
//       <Animated.ScrollView
//         style={[globalStyles.screen]}
//         contentContainerStyle={globalStyles.container}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         {/* Header Row */}
//         <Animatable.View
//           animation="fadeInDown"
//           duration={600}
//           delay={100}
//           useNativeDriver
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             marginBottom: 6,
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: 17,
//               fontWeight: '800',
//               color: theme.colors.foreground,
//             }}
//             numberOfLines={1}
//             ellipsizeMode="tail">
//             {firstName
//               ? `Hey ${firstName}, Ready to Get Styled Today?`
//               : 'Hey there, ready to get styled today?'}
//           </Text>

//           <AppleTouchFeedback
//             onPress={() => navigate('Settings')}
//             hapticStyle="impactLight"
//             style={{padding: 6, marginLeft: 10}}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* Video Banner */}
//         <View style={globalStyles.section}>
//           <Animated.View
//             style={{
//               overflow: 'hidden',
//               shadowOffset: {width: 0, height: 6},
//               shadowOpacity: 0.1,
//               shadowRadius: 12,
//               elevation: 5,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.surfaceBorder,
//               borderRadius: tokens.borderRadius.xl,
//               backgroundColor: theme.colors.surface,
//               transform: [
//                 {
//                   translateY: scrollY.interpolate({
//                     inputRange: [0, 100],
//                     outputRange: [0, -10],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//                 {
//                   scale: scrollY.interpolate({
//                     inputRange: [-50, 0, 100],
//                     outputRange: [1.05, 1, 0.97],
//                     extrapolate: 'clamp',
//                   }),
//                 },
//               ],
//             }}>
//             <Video
//               source={require('../assets/images/free4.mp4')}
//               style={{width: '100%', height: 200}}
//               muted
//               repeat
//               resizeMode="cover"
//               rate={1.0}
//               ignoreSilentSwitch="obey"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: 12,
//                 borderRadius: 16,
//                 transform: [
//                   {
//                     translateY: scrollY.interpolate({
//                       inputRange: [0, 100],
//                       outputRange: [0, -4],
//                       extrapolate: 'clamp',
//                     }),
//                   },
//                 ],
//               }}>
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//                 Discover Your Signature Look
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={400}
//                 style={[
//                   styles.bannerSubtext,
//                   {color: theme.colors.buttonText1},
//                 ]}>
//                 Curated just for you this season.
//               </Animatable.Text>
//             </Animated.View>
//           </Animated.View>
//         </View>

//         {/* Weather Section */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>
//             {weather && (
//               <View style={globalStyles.cardStyles1}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   duration={600}
//                   delay={100}
//                   useNativeDriver
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   <View style={{flex: 1}}>
//                     <Text style={styles.weatherCity}>
//                       {weather.celsius.name}
//                     </Text>
//                     <Text style={styles.weatherDesc}>
//                       {weather.celsius.weather[0].description}
//                     </Text>
//                     <Text style={styles.weatherAdvice}>
//                       🌤️{' '}
//                       {weather.fahrenheit.main.temp < 50
//                         ? 'It’s chilly — layer up.'
//                         : weather.fahrenheit.main.temp > 85
//                         ? 'Hot day — keep it light.'
//                         : 'Perfect weather — dress freely.'}
//                     </Text>
//                   </View>
//                   <View style={styles.weatherTempContainer}>
//                     <Text style={styles.weatherTemp}>
//                       {Math.round(weather.fahrenheit.main.temp)}° F
//                     </Text>
//                   </View>
//                 </Animatable.View>
//               </View>
//             )}
//           </Animatable.View>
//         )}

//         {/* AI Stylist Assistant */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={200}
//           duration={700}
//           useNativeDriver
//           style={{
//             marginHorizontal: 16,
//             marginBottom: 20,
//             backgroundColor: theme.colors.surface,
//             borderRadius: 16,
//             padding: 16,
//           }}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               marginBottom: 10,
//             }}>
//             <Icon
//               name="stars"
//               size={22}
//               color={theme.colors.button1}
//               style={{marginRight: 8}}
//             />
//             <Text
//               style={{
//                 fontSize: 17,
//                 fontWeight: '700',
//                 color: theme.colors.foreground,
//               }}>
//               AI Stylist Suggests
//             </Text>
//           </View>

//           <Text
//             style={{
//               fontSize: 14,
//               fontWeight: '500',
//               color: theme.colors.foreground2,
//               lineHeight: 20,
//               marginBottom: 12,
//             }}>
//             {weather?.fahrenheit?.main?.temp < 60
//               ? 'Cool out — layer a knit under a trench with your loafers.'
//               : weather?.fahrenheit?.main?.temp > 85
//               ? 'Warm day — go linen trousers and a Cuban shirt.'
//               : 'Perfect weather — chinos, polo, and monk straps.'}
//           </Text>

//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 10, borderRadius: 12},
//             ]}
//             onPress={() => navigate('Outfit')}>
//             <Text style={globalStyles.buttonPrimaryText}>Get Styled</Text>
//           </AppleTouchFeedback>

//           <View
//             style={{
//               flexDirection: 'row',
//               justifyContent: 'space-between',
//               marginTop: 12,
//             }}>
//             <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//               <Text
//                 style={{
//                   fontSize: 18,
//                   fontWeight: '600',
//                   color: theme.colors.button1,
//                   textDecorationLine: 'underline',
//                 }}>
//                 View Missing Pieces
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//               <Text
//                 style={{
//                   fontSize: 18,
//                   fontWeight: '600',
//                   color: theme.colors.button1,
//                   textDecorationLine: 'underline',
//                 }}>
//                 Ask a Question →
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </Animatable.View>

//         {/* Map, Quick Access, News, Recommended, Saved Looks... */}
//         {/* [REMAINS THE SAME as your original code — no functional changes here] */}

//         <SaveLookModal
//           visible={saveModalVisible}
//           onClose={() => setSaveModalVisible(false)}
//         />
//         <SavedLookPreviewModal
//           visible={previewVisible}
//           look={selectedLook}
//           onClose={() => setPreviewVisible(false)}
//         />
//         <ReaderModal
//           visible={readerVisible}
//           url={readerUrl}
//           title={readerTitle}
//           onClose={() => setReaderVisible(false)}
//         />
//       </Animated.ScrollView>

//       {/* 🎤 Floating Mic Button */}
//       <TouchableOpacity
//         onPress={isRecording ? stopListening : startListening}
//         style={{
//           position: 'absolute',
//           bottom: 40,
//           right: 24,
//           backgroundColor: isRecording ? '#ff4d4d' : theme.colors.button1,
//           width: 64,
//           height: 64,
//           borderRadius: 32,
//           alignItems: 'center',
//           justifyContent: 'center',
//           shadowColor: '#000',
//           shadowOpacity: 0.25,
//           shadowRadius: 6,
//           elevation: 6,
//         }}>
//         <Icon name={isRecording ? 'mic-off' : 'mic'} size={30} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// };

// export default HomeScreen;

/////////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  DEAFULT CLOSED STATE
//   // const [mapVisible, setMapVisible] = useState(false);
//   // const chevron = useRef(new Animated.Value(0)).current;
//   // const mapHeight = useRef(new Animated.Value(0)).current; // start closed
//   // const mapOpacity = useRef(new Animated.Value(0)).current;
//   // const [mapOpen, setMapOpen] = useState(false);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const {speech} = useVoiceControl();
//   useEffect(() => {
//     if (speech) {
//       console.log('[HomeScreen] speech:', speech);
//     }
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <Animatable.View
//         animation="fadeInDown"
//         duration={600}
//         delay={100}
//         useNativeDriver
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Video Banner with ambient parallax + reveal */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
//             backgroundColor: theme.colors.surface,
//             transform: [
//               {
//                 translateY: scrollY.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: [0, -10],
//                   extrapolate: 'clamp',
//                 }),
//               },
//               {
//                 scale: scrollY.interpolate({
//                   inputRange: [-50, 0, 100],
//                   outputRange: [1.05, 1, 0.97],
//                   extrapolate: 'clamp',
//                 }),
//               },
//             ],
//           }}>
//           <Video
//             source={require('../assets/images/free4.mp4')}
//             style={{width: '100%', height: 200}}
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
//               style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={[styles.bannerSubtext, {color: theme.colors.buttonText1}]}>
//               Curated just for you this season.
//             </Animatable.Text>
//           </Animated.View>
//         </Animated.View>
//       </View>

//       {/* Weather Section */}
//       {prefs.weather && (
//         <Animatable.View
//           animation="fadeInUp"
//           duration={700}
//           delay={200}
//           useNativeDriver
//           style={globalStyles.section}>
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
//         </Animatable.View>
//       )}

//       {/* Smart AI Nudge */}
//       {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={400}
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

//       {/* START */}
//       {/* 🧠 AI Stylist Assistant Section */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         useNativeDriver
//         style={{
//           marginHorizontal: 16,
//           marginBottom: 20,
//           backgroundColor: theme.colors.surface,
//           borderRadius: 16,
//           padding: 16,
//           // shadowColor: '#000',
//           // shadowOpacity: 0.06,
//           // shadowRadius: 4,
//           // elevation: 2,
//         }}>
//         <View
//           style={{
//             flexDirection: 'row',
//             alignItems: 'center',
//             marginBottom: 10,
//           }}>
//           <Icon
//             name="stars"
//             size={22}
//             color={theme.colors.button1}
//             style={{marginRight: 8}}
//           />
//           <Text
//             style={{
//               fontSize: 17,
//               fontWeight: '700',
//               color: theme.colors.foreground,
//             }}>
//             AI Stylist Suggests
//           </Text>
//         </View>

//         <Text
//           style={{
//             fontSize: 14,
//             fontWeight: '500',
//             color: theme.colors.foreground2,
//             lineHeight: 20,
//             marginBottom: 12,
//           }}>
//           {weather?.fahrenheit?.main?.temp < 60
//             ? 'Cool out — layer a knit under a trench with your loafers.'
//             : weather?.fahrenheit?.main?.temp > 85
//             ? 'Warm day — go linen trousers and a Cuban shirt.'
//             : 'Perfect weather — chinos, polo, and monk straps.'}
//         </Text>

//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 10, borderRadius: 12},
//           ]}
//           onPress={() => navigate('Outfit')}>
//           <Text style={globalStyles.buttonPrimaryText}>Get Styled</Text>
//         </AppleTouchFeedback>

//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             marginTop: 12,
//           }}>
//           <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//             <Text
//               style={{
//                 fontSize: 18,
//                 fontWeight: '600',
//                 color: theme.colors.button1,
//                 textDecorationLine: 'underline',
//               }}>
//               View Missing Pieces
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//             <Text
//               style={{
//                 fontSize: 18,
//                 fontWeight: '600',
//                 color: theme.colors.button1,
//                 textDecorationLine: 'underline',
//               }}>
//               Ask a Question →
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </Animatable.View>
//       {/* END */}

//       {/* Map Section — collapsible with animated height & fade */}
//       {prefs.locationMap && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Current Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           <Animated.View
//             style={{
//               marginTop: 8,
//               height: mapHeight,
//               opacity: mapOpacity,
//               overflow: 'hidden',
//             }}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 1,
//                   borderColor: theme.colors.surfaceBorder,
//                   overflow: 'hidden',
//                 },
//               ]}>
//               <LiveLocationMap
//                 height={220}
//                 useCustomPin={false}
//                 postHeartbeat={false}
//               />
//             </View>
//           </Animated.View>
//         </Animatable.View>
//       )}

//       {/* Quick Access Section */}
//       {prefs.quickAccess && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={500}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.centeredSection}>
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
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   {label: 'Profile', screen: 'Profile'},
//                 ].map((btn, idx) => (
//                   <Animatable.View
//                     key={btn.screen}
//                     animation="zoomIn"
//                     delay={600 + idx * 100}
//                     duration={500}
//                     useNativeDriver
//                     style={styles.quickAccessItem}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary, {width: 160}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => navigate(btn.screen)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         {btn.label}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </Animatable.View>
//       )}

//       {/* Top Fashion Stories / News Carousel */}
//       {prefs.topFashionStories && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={600}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Discover / Recommended Items */}
//       {prefs.recommendedItems && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={700}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Saved Looks Section */}
//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={800}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.sectionScroll}>
//           <View style={{flexDirection: 'row'}}>
//             <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//           </View>

//           {savedLooks.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved looks.
//               </Text>
//               <TooltipBubble
//                 message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={{paddingRight: 8}}>
//               {savedLooks.map((look, index) => (
//                 <Animatable.View
//                   key={look.id}
//                   animation="fadeInUp"
//                   delay={900 + index * 100}
//                   useNativeDriver
//                   style={globalStyles.outfitCard}>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           )}
//         </Animatable.View>
//       )}

//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1000}
//           duration={700}
//           useNativeDriver
//           style={{alignItems: 'center', marginVertical: 16}}>
//           <AppleTouchFeedback
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
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
//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

/////////////

// LAST FULL MVP FOR MOM VERSION KEEP WORKING BEFORE NEW ADDITIONS

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const [weather, setWeather] = useState<any>(null);
//   const userId = useUUID();

//   // 🎨 Load user's saved theme mode from backend on app load
//   useEffect(() => {
//     if (!userId) return;
//     const loadTheme = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch user');
//         const data = await res.json();

//         if (data?.theme_mode) {
//           console.log('🎨 Applying saved theme:', data.theme_mode);
//           setSkin(data.theme_mode);
//         }
//       } catch (err) {
//         console.error('❌ Failed to load theme mode:', err);
//       }
//     };
//     loadTheme();
//   }, [userId, setSkin]);

//   const [firstName, setFirstName] = useState('');
//   const [saveModalVisible, setSaveModalVisible] = useState(false);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  DEAFULT CLOSED STATE
//   // const [mapVisible, setMapVisible] = useState(false);
//   // const chevron = useRef(new Animated.Value(0)).current;
//   // const mapHeight = useRef(new Animated.Value(0)).current; // start closed
//   // const mapOpacity = useRef(new Animated.Value(0)).current;
//   // const [mapOpen, setMapOpen] = useState(false);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const {speech} = useVoiceControl();
//   useEffect(() => {
//     if (speech) {
//       console.log('[HomeScreen] speech:', speech);
//     }
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <Animatable.View
//         animation="fadeInDown"
//         duration={600}
//         delay={100}
//         useNativeDriver
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Video Banner with ambient parallax + reveal */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
//             backgroundColor: theme.colors.surface,
//             transform: [
//               {
//                 translateY: scrollY.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: [0, -10],
//                   extrapolate: 'clamp',
//                 }),
//               },
//               {
//                 scale: scrollY.interpolate({
//                   inputRange: [-50, 0, 100],
//                   outputRange: [1.05, 1, 0.97],
//                   extrapolate: 'clamp',
//                 }),
//               },
//             ],
//           }}>
//           <Video
//             source={require('../assets/images/free4.mp4')}
//             style={{width: '100%', height: 200}}
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
//               style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={[styles.bannerSubtext, {color: theme.colors.buttonText1}]}>
//               Curated just for you this season.
//             </Animatable.Text>
//           </Animated.View>
//         </Animated.View>
//       </View>

//       {/* Weather Section */}
//       {prefs.weather && (
//         <Animatable.View
//           animation="fadeInUp"
//           duration={700}
//           delay={200}
//           useNativeDriver
//           style={globalStyles.section}>
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
//         </Animatable.View>
//       )}

//       {/* Smart AI Nudge */}
//       {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={400}
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

//       {/* Map Section — collapsible with animated height & fade */}
//       {prefs.locationMap && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Current Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           <Animated.View
//             style={{
//               marginTop: 8,
//               height: mapHeight,
//               opacity: mapOpacity,
//               overflow: 'hidden',
//             }}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 1,
//                   borderColor: theme.colors.surfaceBorder,
//                   overflow: 'hidden',
//                 },
//               ]}>
//               <LiveLocationMap
//                 height={220}
//                 useCustomPin={false}
//                 postHeartbeat={false}
//               />
//             </View>
//           </Animated.View>
//         </Animatable.View>
//       )}

//       {/* Quick Access Section */}
//       {prefs.quickAccess && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={500}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.centeredSection}>
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
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   {label: 'Profile', screen: 'Profile'},
//                 ].map((btn, idx) => (
//                   <Animatable.View
//                     key={btn.screen}
//                     animation="zoomIn"
//                     delay={600 + idx * 100}
//                     duration={500}
//                     useNativeDriver
//                     style={styles.quickAccessItem}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary, {width: 160}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => navigate(btn.screen)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         {btn.label}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </Animatable.View>
//       )}

//       {/* Top Fashion Stories / News Carousel */}
//       {prefs.topFashionStories && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={600}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Discover / Recommended Items */}
//       {prefs.recommendedItems && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={700}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Saved Looks Section */}
//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={800}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.sectionScroll}>
//           <View style={{flexDirection: 'row'}}>
//             <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//           </View>

//           {savedLooks.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved looks.
//               </Text>
//               <TooltipBubble
//                 message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={{paddingRight: 8}}>
//               {savedLooks.map((look, index) => (
//                 <Animatable.View
//                   key={look.id}
//                   animation="fadeInUp"
//                   delay={900 + index * 100}
//                   useNativeDriver
//                   style={globalStyles.outfitCard}>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           )}
//         </Animatable.View>
//       )}

//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1000}
//           duration={700}
//           useNativeDriver
//           style={{alignItems: 'center', marginVertical: 16}}>
//           <AppleTouchFeedback
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
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
//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

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
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  DEAFULT CLOSED STATE
//   // const [mapVisible, setMapVisible] = useState(false);
//   // const chevron = useRef(new Animated.Value(0)).current;
//   // const mapHeight = useRef(new Animated.Value(0)).current; // start closed
//   // const mapOpacity = useRef(new Animated.Value(0)).current;
//   // const [mapOpen, setMapOpen] = useState(false);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const {speech} = useVoiceControl();
//   useEffect(() => {
//     if (speech) {
//       console.log('[HomeScreen] speech:', speech);
//     }
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <Animatable.View
//         animation="fadeInDown"
//         duration={600}
//         delay={100}
//         useNativeDriver
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Video Banner with ambient parallax + reveal */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
//             backgroundColor: theme.colors.surface,
//             transform: [
//               {
//                 translateY: scrollY.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: [0, -10],
//                   extrapolate: 'clamp',
//                 }),
//               },
//               {
//                 scale: scrollY.interpolate({
//                   inputRange: [-50, 0, 100],
//                   outputRange: [1.05, 1, 0.97],
//                   extrapolate: 'clamp',
//                 }),
//               },
//             ],
//           }}>
//           <Video
//             source={require('../assets/images/free4.mp4')}
//             style={{width: '100%', height: 200}}
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
//               style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={[styles.bannerSubtext, {color: theme.colors.buttonText1}]}>
//               Curated just for you this season.
//             </Animatable.Text>
//           </Animated.View>
//         </Animated.View>
//       </View>

//       {/* Weather Section */}
//       {prefs.weather && (
//         <Animatable.View
//           animation="fadeInUp"
//           duration={700}
//           delay={200}
//           useNativeDriver
//           style={globalStyles.section}>
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
//         </Animatable.View>
//       )}

//       {/* Smart AI Nudge */}
//       {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={400}
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

//       {/* Map Section — collapsible with animated height & fade */}
//       {prefs.locationMap && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Current Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           <Animated.View
//             style={{
//               marginTop: 8,
//               height: mapHeight,
//               opacity: mapOpacity,
//               overflow: 'hidden',
//             }}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 1,
//                   borderColor: theme.colors.surfaceBorder,
//                   overflow: 'hidden',
//                 },
//               ]}>
//               <LiveLocationMap
//                 height={220}
//                 useCustomPin={false}
//                 postHeartbeat={false}
//               />
//             </View>
//           </Animated.View>
//         </Animatable.View>
//       )}

//       {/* Quick Access Section */}
//       {prefs.quickAccess && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={500}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.centeredSection}>
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
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   {label: 'Profile', screen: 'Profile'},
//                 ].map((btn, idx) => (
//                   <Animatable.View
//                     key={btn.screen}
//                     animation="zoomIn"
//                     delay={600 + idx * 100}
//                     duration={500}
//                     useNativeDriver
//                     style={styles.quickAccessItem}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary, {width: 160}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => navigate(btn.screen)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         {btn.label}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </Animatable.View>
//       )}

//       {/* Top Fashion Stories / News Carousel */}
//       {prefs.topFashionStories && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={600}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Discover / Recommended Items */}
//       {prefs.recommendedItems && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={700}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Saved Looks Section */}
//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={800}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.sectionScroll}>
//           <View style={{flexDirection: 'row'}}>
//             <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//           </View>

//           {savedLooks.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved looks.
//               </Text>
//               <TooltipBubble
//                 message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={{paddingRight: 8}}>
//               {savedLooks.map((look, index) => (
//                 <Animatable.View
//                   key={look.id}
//                   animation="fadeInUp"
//                   delay={900 + index * 100}
//                   useNativeDriver
//                   style={globalStyles.outfitCard}>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           )}
//         </Animatable.View>
//       )}

//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1000}
//           duration={700}
//           useNativeDriver
//           style={{alignItems: 'center', marginVertical: 16}}>
//           <AppleTouchFeedback
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
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
//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

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
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   //  DEAFULT CLOSED STATE
//   // const [mapVisible, setMapVisible] = useState(false);
//   // const chevron = useRef(new Animated.Value(0)).current;
//   // const mapHeight = useRef(new Animated.Value(0)).current; // start closed
//   // const mapOpacity = useRef(new Animated.Value(0)).current;
//   // const [mapOpen, setMapOpen] = useState(false);

//   //  TOOL TIPS
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const {speech} = useVoiceControl();
//   useEffect(() => {
//     if (speech) {
//       console.log('[HomeScreen] speech:', speech);
//     }
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <Animatable.View
//         animation="fadeInDown"
//         duration={600}
//         delay={100}
//         useNativeDriver
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Video Banner with ambient parallax + reveal */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
//             backgroundColor: theme.colors.surface,
//             transform: [
//               {
//                 translateY: scrollY.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: [0, -10],
//                   extrapolate: 'clamp',
//                 }),
//               },
//               {
//                 scale: scrollY.interpolate({
//                   inputRange: [-50, 0, 100],
//                   outputRange: [1.05, 1, 0.97],
//                   extrapolate: 'clamp',
//                 }),
//               },
//             ],
//           }}>
//           <Video
//             source={require('../assets/images/free4.mp4')}
//             style={{width: '100%', height: 200}}
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
//               style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={[styles.bannerSubtext, {color: theme.colors.buttonText1}]}>
//               Curated just for you this season.
//             </Animatable.Text>
//           </Animated.View>
//         </Animated.View>
//       </View>

//       {/* Weather Section */}
//       {prefs.weather && (
//         <Animatable.View
//           animation="fadeInUp"
//           duration={700}
//           delay={200}
//           useNativeDriver
//           style={globalStyles.section}>
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
//         </Animatable.View>
//       )}

//       {/* Smart AI Nudge */}
//       {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={400}
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

//       {/* Map Section — collapsible with animated height & fade */}
//       {prefs.locationMap && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Current Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           <Animated.View
//             style={{
//               marginTop: 8,
//               height: mapHeight,
//               opacity: mapOpacity,
//               overflow: 'hidden',
//             }}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 1,
//                   borderColor: theme.colors.surfaceBorder,
//                   overflow: 'hidden',
//                 },
//               ]}>
//               <LiveLocationMap
//                 height={220}
//                 useCustomPin={false}
//                 postHeartbeat={false}
//               />
//             </View>
//           </Animated.View>
//         </Animatable.View>
//       )}

//       {/* Quick Access Section */}
//       {prefs.quickAccess && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={500}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.centeredSection}>
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
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   {label: 'Profile', screen: 'Profile'},
//                 ].map((btn, idx) => (
//                   <Animatable.View
//                     key={btn.screen}
//                     animation="zoomIn"
//                     delay={600 + idx * 100}
//                     duration={500}
//                     useNativeDriver
//                     style={styles.quickAccessItem}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary, {width: 160}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => navigate(btn.screen)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         {btn.label}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </Animatable.View>
//       )}

//       {/* Top Fashion Stories / News Carousel */}
//       {prefs.topFashionStories && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={600}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Discover / Recommended Items */}
//       {prefs.recommendedItems && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={700}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Saved Looks Section */}
//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={800}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.sectionScroll}>
//           <View style={{flexDirection: 'row'}}>
//             <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//           </View>

//           {savedLooks.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved looks.
//               </Text>
//               <TooltipBubble
//                 message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={{paddingRight: 8}}>
//               {savedLooks.map((look, index) => (
//                 <Animatable.View
//                   key={look.id}
//                   animation="fadeInUp"
//                   delay={900 + index * 100}
//                   useNativeDriver
//                   style={globalStyles.outfitCard}>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           )}
//         </Animatable.View>
//       )}

//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1000}
//           duration={700}
//           useNativeDriver
//           style={{alignItems: 'center', marginVertical: 16}}>
//           <AppleTouchFeedback
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
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
//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

//////////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current; // start open
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   // ───────────── Tooltip states ─────────────
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const {speech} = useVoiceControl();
//   useEffect(() => {
//     if (speech) {
//       console.log('[HomeScreen] speech:', speech);
//     }
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <Animatable.View
//         animation="fadeInDown"
//         duration={600}
//         delay={100}
//         useNativeDriver
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Video Banner with ambient parallax + reveal */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
//             backgroundColor: theme.colors.surface,
//             transform: [
//               {
//                 translateY: scrollY.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: [0, -10],
//                   extrapolate: 'clamp',
//                 }),
//               },
//               {
//                 scale: scrollY.interpolate({
//                   inputRange: [-50, 0, 100],
//                   outputRange: [1.05, 1, 0.97],
//                   extrapolate: 'clamp',
//                 }),
//               },
//             ],
//           }}>
//           <Video
//             source={require('../assets/images/free4.mp4')}
//             style={{width: '100%', height: 200}}
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
//               style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={[styles.bannerSubtext, {color: theme.colors.buttonText1}]}>
//               Curated just for you this season.
//             </Animatable.Text>
//           </Animated.View>
//         </Animated.View>
//       </View>

//       {/* Weather Section */}
//       {prefs.weather && (
//         <Animatable.View
//           animation="fadeInUp"
//           duration={700}
//           delay={200}
//           useNativeDriver
//           style={globalStyles.section}>
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
//         </Animatable.View>
//       )}

//       {/* Smart AI Nudge */}
//       {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={400}
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

//       {/* Map Section — collapsible with animated height & fade */}
//       {prefs.locationMap && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           <Animated.View
//             style={{
//               marginTop: 8,
//               height: mapHeight,
//               opacity: mapOpacity,
//               overflow: 'hidden',
//             }}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 1,
//                   borderColor: theme.colors.surfaceBorder,
//                   overflow: 'hidden',
//                 },
//               ]}>
//               <LiveLocationMap
//                 height={220}
//                 useCustomPin={false}
//                 postHeartbeat={false}
//               />
//             </View>
//           </Animated.View>
//         </Animatable.View>
//       )}

//       {/* Quick Access Section */}
//       {prefs.quickAccess && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={500}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.centeredSection}>
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
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   {label: 'Profile', screen: 'Profile'},
//                 ].map((btn, idx) => (
//                   <Animatable.View
//                     key={btn.screen}
//                     animation="zoomIn"
//                     delay={600 + idx * 100}
//                     duration={500}
//                     useNativeDriver
//                     style={styles.quickAccessItem}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary, {width: 160}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => navigate(btn.screen)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         {btn.label}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </Animatable.View>
//       )}

//       {/* Top Fashion Stories / News Carousel */}
//       {prefs.topFashionStories && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={600}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Discover / Recommended Items */}
//       {prefs.recommendedItems && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={700}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Saved Looks Section */}
//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={800}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.sectionScroll}>
//           <View style={{flexDirection: 'row'}}>
//             <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//           </View>

//           {savedLooks.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved looks.
//               </Text>
//               <TooltipBubble
//                 message='You haven’t saved any looks yet. Tap "Add Look" below to add your
//               favorite looks.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={{paddingRight: 8}}>
//               {savedLooks.map((look, index) => (
//                 <Animatable.View
//                   key={look.id}
//                   animation="fadeInUp"
//                   delay={900 + index * 100}
//                   useNativeDriver
//                   style={globalStyles.outfitCard}>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           )}
//         </Animatable.View>
//       )}

//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1000}
//           duration={700}
//           useNativeDriver
//           style={{alignItems: 'center', marginVertical: 16}}>
//           <AppleTouchFeedback
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
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
//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current; // start open
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   // ───────────── Tooltip states ─────────────
//   const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
//   const [showQuickAccessTooltip, setShowQuickAccessTooltip] = useState<
//     string | null
//   >(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const {speech} = useVoiceControl();
//   useEffect(() => {
//     if (speech) {
//       console.log('[HomeScreen] speech:', speech);
//     }
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: '#fff',
//       fontSize: 13,
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <Animatable.View
//         animation="fadeInDown"
//         duration={600}
//         delay={100}
//         useNativeDriver
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Video Banner with ambient parallax + reveal */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
//             backgroundColor: theme.colors.surface,
//             transform: [
//               {
//                 translateY: scrollY.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: [0, -10],
//                   extrapolate: 'clamp',
//                 }),
//               },
//               {
//                 scale: scrollY.interpolate({
//                   inputRange: [-50, 0, 100],
//                   outputRange: [1.05, 1, 0.97],
//                   extrapolate: 'clamp',
//                 }),
//               },
//             ],
//           }}>
//           <Video
//             source={require('../assets/images/free4.mp4')}
//             style={{width: '100%', height: 200}}
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
//               style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={[styles.bannerSubtext, {color: theme.colors.buttonText1}]}>
//               Curated just for you this season.
//             </Animatable.Text>
//           </Animated.View>
//         </Animated.View>
//       </View>

//       {/* Weather Section */}
//       {prefs.weather && (
//         <Animatable.View
//           animation="fadeInUp"
//           duration={700}
//           delay={200}
//           useNativeDriver
//           style={globalStyles.section}>
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
//         </Animatable.View>
//       )}

//       {/* Smart AI Nudge */}
//       {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={400}
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

//       {/* Map Section — collapsible with animated height & fade */}
//       {prefs.locationMap && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           <Animated.View
//             style={{
//               marginTop: 8,
//               height: mapHeight,
//               opacity: mapOpacity,
//               overflow: 'hidden',
//             }}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 1,
//                   borderColor: theme.colors.surfaceBorder,
//                   overflow: 'hidden',
//                 },
//               ]}>
//               <LiveLocationMap
//                 height={220}
//                 useCustomPin={false}
//                 postHeartbeat={false}
//               />
//             </View>
//           </Animated.View>
//         </Animatable.View>
//       )}

//       {/* Quick Access Section */}
//       {prefs.quickAccess && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={500}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.centeredSection}>
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
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   {label: 'Profile', screen: 'Profile'},
//                 ].map((btn, idx) => (
//                   <Animatable.View
//                     key={btn.screen}
//                     animation="zoomIn"
//                     delay={600 + idx * 100}
//                     duration={500}
//                     useNativeDriver
//                     style={styles.quickAccessItem}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary, {width: 160}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => navigate(btn.screen)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         {btn.label}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </Animatable.View>
//       )}

//       {/* Top Fashion Stories / News Carousel */}
//       {prefs.topFashionStories && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={600}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <View style={{flexDirection: 'row'}}>
//             <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//             {/* ℹ️ Tooltip Icon */}
//             <View style={{alignSelf: 'flex-start'}}>
//               <TooltipBubble
//                 message='No stories found. Go to the "Fashion News" page to add content.'
//                 position="top"
//               />
//             </View>
//           </View>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Discover / Recommended Items */}
//       {prefs.recommendedItems && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={700}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Saved Looks Section */}
//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={800}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.sectionScroll}>
//           <View style={{flexDirection: 'row'}}>
//             <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//             {/* ℹ️ Tooltip Icon */}
//             <View style={{alignSelf: 'flex-start'}}>
//               <TooltipBubble
//                 message='You haven’t saved any outfits yet. Tap "Add Look" to add your
//               favorite looks.'
//                 position="top"
//               />
//             </View>
//           </View>

//           {savedLooks.length === 0 ? (
//             <Text style={globalStyles.missingDataMessage1}>
//               No saved looks.
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
//                   delay={900 + index * 100}
//                   useNativeDriver
//                   style={globalStyles.outfitCard}>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           )}
//         </Animatable.View>
//       )}

//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1000}
//           duration={700}
//           useNativeDriver
//           style={{alignItems: 'center', marginVertical: 16}}>
//           <AppleTouchFeedback
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
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
//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

///////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current; // start open
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const {speech} = useVoiceControl();
//   useEffect(() => {
//     if (speech) {
//       console.log('[HomeScreen] speech:', speech);
//     }
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <Animatable.View
//         animation="fadeInDown"
//         duration={600}
//         delay={100}
//         useNativeDriver
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Video Banner with ambient parallax + reveal */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
//             backgroundColor: theme.colors.surface,
//             transform: [
//               {
//                 translateY: scrollY.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: [0, -10],
//                   extrapolate: 'clamp',
//                 }),
//               },
//               {
//                 scale: scrollY.interpolate({
//                   inputRange: [-50, 0, 100],
//                   outputRange: [1.05, 1, 0.97],
//                   extrapolate: 'clamp',
//                 }),
//               },
//             ],
//           }}>
//           <Video
//             source={require('../assets/images/free4.mp4')}
//             style={{width: '100%', height: 200}}
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
//               style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={[styles.bannerSubtext, {color: theme.colors.buttonText1}]}>
//               Curated just for you this season.
//             </Animatable.Text>
//           </Animated.View>
//         </Animated.View>
//       </View>

//       {/* Weather Section */}
//       {prefs.weather && (
//         <Animatable.View
//           animation="fadeInUp"
//           duration={700}
//           delay={200}
//           useNativeDriver
//           style={globalStyles.section}>
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
//         </Animatable.View>
//       )}

//       {/* Smart AI Nudge */}
//       {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={400}
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

//       {/* Map Section — collapsible with animated height & fade */}
//       {prefs.locationMap && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           <Animated.View
//             style={{
//               marginTop: 8,
//               height: mapHeight,
//               opacity: mapOpacity,
//               overflow: 'hidden',
//             }}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 1,
//                   borderColor: theme.colors.surfaceBorder,
//                   overflow: 'hidden',
//                 },
//               ]}>
//               <LiveLocationMap
//                 height={220}
//                 useCustomPin={false}
//                 postHeartbeat={false}
//               />
//             </View>
//           </Animated.View>
//         </Animatable.View>
//       )}

//       {/* Quick Access Section */}
//       {prefs.quickAccess && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={500}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.centeredSection}>
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
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   {label: 'Profile', screen: 'Profile'},
//                 ].map((btn, idx) => (
//                   <Animatable.View
//                     key={btn.screen}
//                     animation="zoomIn"
//                     delay={600 + idx * 100}
//                     duration={500}
//                     useNativeDriver
//                     style={styles.quickAccessItem}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary, {width: 160}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => navigate(btn.screen)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         {btn.label}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </Animatable.View>
//       )}

//       {/* Top Fashion Stories / News Carousel */}
//       {prefs.topFashionStories && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={600}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Discover / Recommended Items */}
//       {prefs.recommendedItems && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={700}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Saved Looks Section */}
//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={800}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.sectionScroll}>
//           <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//           {savedLooks.length === 0 ? (
//             <Text style={globalStyles.missingDataMessage1}>
//               You haven’t saved any outfits yet. Tap "Add Look" to add your
//               favorite looks.
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
//                   delay={900 + index * 100}
//                   useNativeDriver
//                   style={globalStyles.outfitCard}>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           )}
//         </Animatable.View>
//       )}

//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1000}
//           duration={700}
//           useNativeDriver
//           style={{alignItems: 'center', marginVertical: 16}}>
//           <AppleTouchFeedback
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
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
//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

////////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Animated,
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current; // start open
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const {speech} = useVoiceControl();
//   useEffect(() => {
//     if (speech) {
//       console.log('[HomeScreen] speech:', speech);
//     }
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <Animatable.View
//         animation="fadeInDown"
//         duration={600}
//         delay={100}
//         useNativeDriver
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Video Banner with ambient parallax + reveal */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
//             backgroundColor: theme.colors.surface,
//             transform: [
//               {
//                 translateY: scrollY.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: [0, -10],
//                   extrapolate: 'clamp',
//                 }),
//               },
//               {
//                 scale: scrollY.interpolate({
//                   inputRange: [-50, 0, 100],
//                   outputRange: [1.05, 1, 0.97],
//                   extrapolate: 'clamp',
//                 }),
//               },
//             ],
//           }}>
//           <Video
//             source={require('../assets/images/free4.mp4')}
//             style={{width: '100%', height: 200}}
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
//               style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={[styles.bannerSubtext, {color: theme.colors.buttonText1}]}>
//               Curated just for you this season.
//             </Animatable.Text>
//           </Animated.View>
//         </Animated.View>
//       </View>

//       {/* Weather Section */}
//       {prefs.weather && (
//         <Animatable.View
//           animation="fadeInUp"
//           duration={700}
//           delay={200}
//           useNativeDriver
//           style={globalStyles.section}>
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
//         </Animatable.View>
//       )}

//       {/* Smart AI Nudge */}
//       {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={400}
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

//       {/* Map Section — collapsible with animated height & fade */}
//       {prefs.locationMap && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           <Animated.View
//             style={{
//               marginTop: 8,
//               height: mapHeight,
//               opacity: mapOpacity,
//               overflow: 'hidden',
//             }}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 1,
//                   borderColor: theme.colors.surfaceBorder,
//                   overflow: 'hidden',
//                 },
//               ]}>
//               <LiveLocationMap
//                 height={220}
//                 useCustomPin={false}
//                 postHeartbeat={false}
//               />
//             </View>
//           </Animated.View>
//         </Animatable.View>
//       )}

//       {/* Quick Access Section */}
//       {prefs.quickAccess && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={500}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.centeredSection}>
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
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   {label: 'Profile', screen: 'Profile'},
//                 ].map((btn, idx) => (
//                   <Animatable.View
//                     key={btn.screen}
//                     animation="zoomIn"
//                     delay={600 + idx * 100}
//                     duration={500}
//                     useNativeDriver
//                     style={styles.quickAccessItem}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary, {width: 160}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => navigate(btn.screen)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         {btn.label}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </Animatable.View>
//       )}

//       {/* Top Fashion Stories / News Carousel */}
//       {prefs.topFashionStories && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={600}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Discover / Recommended Items */}
//       {prefs.recommendedItems && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={700}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Saved Looks Section */}
//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={800}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.sectionScroll}>
//           <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//           {savedLooks.length === 0 ? (
//             <Text style={globalStyles.missingDataMessage1}>
//               You haven’t saved any outfits yet. Tap "Add Look" to add your
//               favorite looks.
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
//                   delay={900 + index * 100}
//                   useNativeDriver
//                   style={globalStyles.outfitCard}>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           )}
//         </Animatable.View>
//       )}

//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1000}
//           duration={700}
//           useNativeDriver
//           style={{alignItems: 'center', marginVertical: 16}}>
//           <AppleTouchFeedback
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
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
//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

///////////////////

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
//   Easing,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Parallax / blur / shadow interpolations
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
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   // Map dropdown state & animations
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current; // start open
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const {speech} = useVoiceControl();
//   useEffect(() => {
//     if (speech) {
//       console.log('[HomeScreen] speech:', speech);
//     }
//   }, [speech]);

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => {
//         setMapOpen(false);
//       });
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           easing: Easing.out(Easing.quad),
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });

//   const styles = StyleSheet.create({
//     bannerImage: {width: '100%', height: 200},
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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <Animatable.View
//         animation="fadeInDown"
//         duration={600}
//         delay={100}
//         useNativeDriver
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Video Banner with ambient parallax + reveal */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
//             backgroundColor: theme.colors.surface,
//             transform: [
//               {
//                 translateY: scrollY.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: [0, -10],
//                   extrapolate: 'clamp',
//                 }),
//               },
//               {
//                 scale: scrollY.interpolate({
//                   inputRange: [-50, 0, 100],
//                   outputRange: [1.05, 1, 0.97],
//                   extrapolate: 'clamp',
//                 }),
//               },
//             ],
//           }}>
//           <Video
//             source={require('../assets/images/free4.mp4')}
//             style={{width: '100%', height: 200}}
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
//               style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={[styles.bannerSubtext, {color: theme.colors.buttonText1}]}>
//               Curated just for you this season.
//             </Animatable.Text>
//           </Animated.View>
//         </Animated.View>
//       </View>

//       {/* Weather Section */}
//       {prefs.weather && (
//         <Animatable.View
//           animation="fadeInUp"
//           duration={700}
//           delay={200}
//           useNativeDriver
//           style={globalStyles.section}>
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
//         </Animatable.View>
//       )}

//       {/* Smart AI Nudge */}
//       {prefs.weather && weather?.fahrenheit?.main?.temp < 55 && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={400}
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

//       {/* Map Section — collapsible with animated height & fade */}
//       {prefs.locationMap && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={300}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           <Animated.View
//             style={{
//               marginTop: 8,
//               height: mapHeight,
//               opacity: mapOpacity,
//               overflow: 'hidden',
//             }}>
//             <View
//               style={[
//                 globalStyles.cardStyles1,
//                 {
//                   padding: 1,
//                   borderColor: theme.colors.surfaceBorder,
//                   overflow: 'hidden',
//                 },
//               ]}>
//               <LiveLocationMap
//                 height={220}
//                 useCustomPin={false}
//                 postHeartbeat={false}
//               />
//             </View>
//           </Animated.View>
//         </Animatable.View>
//       )}

//       {/* Quick Access Section */}
//       {prefs.quickAccess && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={500}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.centeredSection}>
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
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   {label: 'Profile', screen: 'Profile'},
//                 ].map((btn, idx) => (
//                   <Animatable.View
//                     key={btn.screen}
//                     animation="zoomIn"
//                     delay={600 + idx * 100}
//                     duration={500}
//                     useNativeDriver
//                     style={styles.quickAccessItem}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary, {width: 160}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => navigate(btn.screen)}>
//                       <Text style={globalStyles.buttonPrimaryText}>
//                         {btn.label}
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </Animatable.View>
//       )}

//       {/* Top Fashion Stories / News Carousel */}
//       {prefs.topFashionStories && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={600}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Discover / Recommended Items */}
//       {prefs.recommendedItems && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={700}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </Animatable.View>
//       )}

//       {/* Saved Looks Section */}
//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={800}
//           duration={700}
//           useNativeDriver
//           style={globalStyles.sectionScroll}>
//           <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//           {savedLooks.length === 0 ? (
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 paddingLeft: 16,
//                 fontStyle: 'italic',
//               }}>
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
//                   delay={900 + index * 100}
//                   useNativeDriver
//                   style={globalStyles.outfitCard}>
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           )}
//         </Animatable.View>
//       )}

//       {prefs.savedLooks && (
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1000}
//           duration={700}
//           useNativeDriver
//           style={{alignItems: 'center', marginVertical: 16}}>
//           <AppleTouchFeedback
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
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
//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

/////////////////////

// // apps/mobile/src/screens/HomeScreen.tsx /
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
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// type NewsCarouselProps = {
//   onOpenArticle?: (url: string, title?: string) => void;
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
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);
//   // ▼▼▼ Map dropdown state & animations (only addition) ▼▼▼

//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapCardRef = useRef<Animatable.View & View>(null);
//   const mapHeight = useRef(new Animated.Value(220)).current; // start open
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const toggleMap = () => {
//     if (mapOpen) {
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 0,
//           duration: 300,
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 0,
//           duration: 250,
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start(() => setMapOpen(false));
//     } else {
//       setMapOpen(true);
//       Animated.parallel([
//         Animated.timing(mapHeight, {
//           toValue: 220,
//           duration: 320,
//           useNativeDriver: false,
//         }),
//         Animated.timing(mapOpacity, {
//           toValue: 1,
//           duration: 300,
//           useNativeDriver: false,
//         }),
//         Animated.timing(chevron, {
//           toValue: 1,
//           duration: 220,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });
//   // ▲▲▲ End map dropdown additions ▲▲▲

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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//   });

//   // Avoid flicker until prefs are ready
//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           paddingTop: 0,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </View>

//       {/* Video Banner with ambient parallax */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
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
//               style={[styles.bannerText, {color: theme.colors.buttonText1}]}>
//               Discover Your Signature Look
//             </Animatable.Text>
//             <Animatable.Text
//               animation="fadeIn"
//               delay={400}
//               style={[styles.bannerSubtext, {color: theme.colors.buttonText1}]}>
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

//       {/* Map Section — now collapsible */}
//       {prefs.locationMap && (
//         <View style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           {mapOpen && (
//             <Animated.View
//               style={{
//                 marginTop: 8,
//                 height: mapHeight,
//                 opacity: mapOpacity,
//                 overflow: 'hidden', // critical: prevents the map from "leaking out"
//               }}>
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     padding: 1,
//                     borderColor: theme.colors.surfaceBorder,
//                     overflow: 'hidden',
//                   },
//                 ]}>
//                 <LiveLocationMap
//                   height={220}
//                   useCustomPin={false}
//                   postHeartbeat={false}
//                 />
//               </View>
//             </Animated.View>
//           )}
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
//                   // {label: 'Ai Chat', screen: 'AiStylistChatScreen'},
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   // {label: 'Fashion News', screen: 'Explore'},
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

//       {/* NEW: Top Fashion Stories (preview carousel) */}
//       {prefs.topFashionStories && (
//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </View>
//       )}

//       {prefs.recommendedItems && (
//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </View>
//       )}

//       {/* // 2) Saved Looks */}
//       {prefs.savedLooks && (
//         <View style={globalStyles.sectionScroll}>
//           <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//           {savedLooks.length === 0 ? (
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 paddingLeft: 16,
//                 fontStyle: 'italic',
//               }}>
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
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
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
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
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

//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

///////////////////////

// // apps/mobile/src/screens/HomeScreen.tsx /
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
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// type NewsCarouselProps = {
//   onOpenArticle?: (url: string, title?: string) => void;
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
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);
//   // ▼▼▼ Map dropdown state & animations (only addition) ▼▼▼
//   const [mapOpen, setMapOpen] = useState(true);
//   const chevron = useRef(new Animated.Value(0)).current; // 0: closed, 1: open
//   const mapCardRef = useRef<Animatable.View & View>(null);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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

//   const toggleMap = () => {
//     if (mapOpen) {
//       // slide out then hide
//       mapCardRef.current?.slideOutUp(220).then(() => {
//         setMapOpen(false);
//         Animated.timing(chevron, {
//           toValue: 0,
//           duration: 180,
//           useNativeDriver: true,
//         }).start();
//       });
//     } else {
//       setMapOpen(true);
//       Animated.timing(chevron, {
//         toValue: 1,
//         duration: 220,
//         useNativeDriver: true,
//       }).start();
//     }
//   };

//   const rotateZ = chevron.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '180deg'],
//   });
//   // ▲▲▲ End map dropdown additions ▲▲▲

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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       color: theme.colors.foreground,
//     },
//   });

//   // Avoid flicker until prefs are ready
//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   return (
//     <Animated.ScrollView
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           paddingTop: 0,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </View>

//       {/* Video Banner with ambient parallax */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
//             borderColor: theme.colors.surfaceBorder,
//             borderRadius: tokens.borderRadius.xl,
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

//       {/* Map Section — now collapsible */}
//       {prefs.locationMap && (
//         <View style={globalStyles.section}>
//           <View
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//             }}>
//             <Text style={globalStyles.sectionTitle}>Your Location</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={toggleMap}
//               style={{
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.sm,
//                 borderColor: theme.colors.surfaceBorder,
//               }}>
//               <View
//                 style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '700',
//                     fontSize: 13,
//                   }}>
//                   {mapOpen ? 'Close' : 'Open'}
//                 </Text>
//                 <Animated.View style={{transform: [{rotateZ}]}}>
//                   <Icon
//                     name="keyboard-arrow-down"
//                     size={18}
//                     color={theme.colors.foreground}
//                   />
//                 </Animated.View>
//               </View>
//             </AppleTouchFeedback>
//           </View>

//           {mapOpen && (
//             <Animatable.View
//               ref={mapCardRef}
//               animation="fadeInDown"
//               duration={260}
//               useNativeDriver
//               style={{marginTop: 8}}>
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     padding: 1,
//                     borderColor: theme.colors.surfaceBorder,
//                     overflow: 'hidden',
//                   },
//                 ]}>
//                 <LiveLocationMap
//                   height={220}
//                   useCustomPin={false}
//                   postHeartbeat={false}
//                 />
//               </View>
//             </Animatable.View>
//           )}
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
//                   // {label: 'Ai Chat', screen: 'AiStylistChatScreen'},
//                   {label: 'Get started', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   // {label: 'Fashion News', screen: 'Explore'},
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

//       {/* NEW: Top Fashion Stories (preview carousel) */}
//       {prefs.topFashionStories && (
//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </View>
//       )}

//       {prefs.recommendedItems && (
//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </View>
//       )}

//       {/* // 2) Saved Looks */}
//       {prefs.savedLooks && (
//         <View style={globalStyles.sectionScroll}>
//           <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//           {savedLooks.length === 0 ? (
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 paddingLeft: 16,
//                 fontStyle: 'italic',
//               }}>
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
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                             borderRadius: tokens.borderRadius.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
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
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
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

//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

////////////////////

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
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';
// import ReaderModal from '../components/FashionFeed/ReaderModal';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// type NewsCarouselProps = {
//   onOpenArticle?: (url: string, title?: string) => void;
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
//   const [readerVisible, setReaderVisible] = useState(false);
//   const [readerUrl, setReaderUrl] = useState<string | undefined>(undefined);
//   const [readerTitle, setReaderTitle] = useState<string | undefined>(undefined);

//   const openArticle = (url: string, title?: string) => {
//     setReaderUrl(url);
//     setReaderTitle(title);
//     setReaderVisible(true);
//   };

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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.buttonText1,
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
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           paddingTop: 0,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//             // textShadowColor: 'rgba(0,0,0,0.6)',
//             // textShadowOffset: {width: 0, height: 1},
//             // textShadowRadius: 2,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {/* {firstName
//             ? `Hey ${firstName}, ready to get styled today?`
//             : 'Hey there, ready to get styled today?'} */}
//           {firstName
//             ? `Hey ${firstName}, Ready to Get Styled Today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </View>

//       {/* Video Banner with ambient parallax */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
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
//           <View
//             style={[
//               globalStyles.cardStyles1,
//               {
//                 padding: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               },
//             ]}>
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
//                   // {label: 'Ai Chat', screen: 'AiStylistChatScreen'},
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   // {label: 'Fashion News', screen: 'Explore'},
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

//       {/* NEW: Top Fashion Stories (preview carousel) */}
//       {prefs.topFashionStories && (
//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel onOpenArticle={openArticle} />
//         </View>
//       )}

//       {prefs.recommendedItems && (
//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel onOpenItem={openArticle} />
//         </View>
//       )}

//       {/* // 2) Saved Looks */}
//       {prefs.savedLooks && (
//         <View style={globalStyles.sectionScroll}>
//           <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
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
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
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
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
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

//       <ReaderModal
//         visible={readerVisible}
//         url={readerUrl}
//         title={readerTitle}
//         onClose={() => setReaderVisible(false)}
//       />
//     </Animated.ScrollView>
//   );
// };

// export default HomeScreen;

//////////////////////

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
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';

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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.foreground,
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
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           paddingTop: 0,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//             textShadowColor: 'rgba(0,0,0,0.6)',
//             textShadowOffset: {width: 0, height: 1},
//             textShadowRadius: 2,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, ready to get styled today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </View>

//       {/* Video Banner with ambient parallax */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
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
//           <View
//             style={[
//               globalStyles.cardStyles1,
//               {
//                 padding: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               },
//             ]}>
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
//                   // {label: 'Ai Chat', screen: 'AiStylistChatScreen'},
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   // {label: 'Fashion News', screen: 'Explore'},
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

//       {/* NEW: Top Fashion Stories (preview carousel) */}
//       {prefs.topFashionStories && (
//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel />
//         </View>
//       )}

//       {prefs.recommendedItems && (
//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel />
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
//                   <AppleTouchFeedback
//                     hapticStyle="impactLight"
//                     onPress={() => {
//                       setSelectedLook(look);
//                       setPreviewVisible(true);
//                     }}
//                     style={{alignItems: 'center'}}>
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
//                     <Text
//                       style={[globalStyles.label, {marginTop: 6}]}
//                       numberOfLines={1}>
//                       {look.name}
//                     </Text>
//                   </AppleTouchFeedback>
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
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
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

//////////////////

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
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {initializeNotifications} from '../utils/notificationService';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import SaveLookModal from '../components/SavedLookModal/SavedLookModal';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import LiveLocationMap from '../components/LiveLocationMap/LiveLocationMap';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';
// import NewsCarousel from '../components/NewsCarousel/NewsCarousel';

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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.foreground,
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
//       style={[globalStyles.screen]}
//       contentContainerStyle={globalStyles.container}
//       scrollEventThrottle={16}
//       onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
//         useNativeDriver: true,
//       })}>
//       {/* Header Row: Greeting + Menu */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           paddingTop: 0,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//             textShadowColor: 'rgba(0,0,0,0.6)',
//             textShadowOffset: {width: 0, height: 1},
//             textShadowRadius: 2,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, ready to get styled today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </View>

//       {/* Video Banner with ambient parallax */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
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
//           <View
//             style={[
//               globalStyles.cardStyles1,
//               {
//                 padding: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               },
//             ]}>
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
//                   // {label: 'Ai Chat', screen: 'AiStylistChatScreen'},
//                   {label: 'Style Me', screen: 'Outfit'},
//                   {label: 'Wardrobe', screen: 'Wardrobe'},
//                   {label: 'Add Clothes', screen: 'AddItem'},
//                   // {label: 'Fashion News', screen: 'Explore'},
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

//       {/* NEW: Top Fashion Stories (preview carousel) */}
//       {prefs.topFashionStories && (
//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Top Fashion Stories</Text>
//           <NewsCarousel />
//         </View>
//       )}

//       {prefs.recommendedItems && (
//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//           <DiscoverCarousel />
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
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
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
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
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
// import DiscoverCarousel from '../components/DiscoverCarousel/DiscoverCarousel';

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
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
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
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     weatherDesc: {
//       fontSize: 13,
//       color: theme.colors.foreground2,
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
//       color: theme.colors.foreground,
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
//       {/* Header Row: Greeting + Menu */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           paddingTop: 0,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: theme.colors.foreground,
//             textShadowColor: 'rgba(0,0,0,0.6)',
//             textShadowOffset: {width: 0, height: 1},
//             textShadowRadius: 2,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, ready to get styled today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button1} />
//         </AppleTouchFeedback>
//       </View>

//       {/* Video Banner with ambient parallax */}
//       <View style={globalStyles.section}>
//         <Animated.View
//           style={{
//             overflow: 'hidden',
//             shadowOffset: {width: 0, height: 6},
//             shadowOpacity: 0.1,
//             shadowRadius: 12,
//             elevation: 5,
//             borderWidth: tokens.borderWidth.md,
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
//           <View
//             style={[
//               globalStyles.cardStyles1,
//               {
//                 padding: 1,
//                 borderColor: theme.colors.surfaceBorder,
//               },
//             ]}>
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

//       {prefs.recommendedItems && (
//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle2, {marginBottom: 10}]}>
//             Recommended Items
//           </Text>
//           <DiscoverCarousel />
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
//                     <View>
//                       <Image
//                         source={{uri: look.image_url}}
//                         style={[
//                           globalStyles.image4,
//                           {
//                             borderColor: theme.colors.surfaceBorder,
//                             borderWidth: tokens.borderWidth.md,
//                           },
//                         ]}
//                         resizeMode="cover"
//                       />
//                     </View>
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
//             style={[globalStyles.buttonPrimary, {width: 125}]}
//             hapticStyle="impactHeavy"
//             onPress={() => setSaveModalVisible(true)}>
//             <Text style={globalStyles.buttonPrimaryText}>Add Look</Text>
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

////////////////////

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
//       {/* Header Row: Greeting + Menu */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 16,
//           paddingTop: 0,
//           marginBottom: 6,
//         }}>
//         <Text
//           style={{
//             flex: 1,
//             fontSize: 17,
//             fontWeight: '800',
//             color: '#fff',
//             textShadowColor: 'rgba(0,0,0,0.6)',
//             textShadowOffset: {width: 0, height: 1},
//             textShadowRadius: 2,
//           }}
//           numberOfLines={1}
//           ellipsizeMode="tail">
//           {firstName
//             ? `Hey ${firstName}, ready to get styled today?`
//             : 'Hey there, ready to get styled today?'}
//         </Text>

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={{padding: 6, marginLeft: 10}}>
//           <Icon name="tune" size={22} color={theme.colors.button3} />
//         </AppleTouchFeedback>
//       </View>

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
