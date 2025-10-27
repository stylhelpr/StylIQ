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
//   Modal,
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
// import {fontScale, moderateScale} from '../utils/scale';
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
// import {Surface} from '../components/LinearGradientComponents/Surface';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// // import SparkleIcon from '../assets/images/sparkle-icon.png';
// // import Future1 from '../assets/images/future-icon1.png';
// import AllSavedLooksModal from '../components/AllSavedLooksModal/AllSavedLooksModal';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {searchProducts} from '../services/productSearchClient';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {Linking} from 'react-native';
// import type {ProductResult} from '../services/productSearchClient';
// import ShopModal from '../components/ShopModal/ShopModal';
// import {Share} from 'react-native';
// import ViewShot from 'react-native-view-shot';
// import PersonalizedShopModal from '../components/PersonalizedShopModal/PersonalizedShopModal';
// import RecreatedLookScreen from './RecreatedLookScreen';
// import {Camera} from 'react-native-vision-camera';
// import {useResponsive} from '../hooks/useResponsive';
// import LiquidGlassCard from '../components/LiquidGlassCard/LiquidGlassCard';
// import {useHomeVoiceCommands} from '../utils/VoiceUtils/VoiceContext';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

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

//   useEffect(() => {
//     (async () => {
//       const status = await Camera.getCameraPermissionStatus();
//       console.log('🔒 Camera permission status:', status);
//       if (status !== 'authorized') {
//         const newStatus = await Camera.requestCameraPermission();
//         console.log('🔓 New camera permission:', newStatus);
//       }
//     })();
//   }, []);

//   // Simple inline collapsible wrapper — smooth open/close animation
//   const CollapsibleSection: React.FC<{
//     title?: string;
//     children: React.ReactNode;
//     open: boolean;
//     onToggle: (newState: boolean) => void;
//   }> = ({title, children, open, onToggle}) => {
//     const animatedHeight = useRef(new Animated.Value(open ? 1 : 0)).current;

//     useEffect(() => {
//       Animated.timing(animatedHeight, {
//         toValue: open ? 1 : 0,
//         duration: 260,
//         easing: Easing.out(Easing.quad),
//         useNativeDriver: false,
//       }).start();
//     }, [open]);

//     const toggle = () => {
//       onToggle(!open);
//     };

//     return (
//       <View
//         style={{
//           overflow: 'hidden',
//           // backgroundColor: theme.colors.background,
//           marginBottom: open ? 4 : 20,
//         }}>
//         {title && (
//           <TouchableOpacity
//             activeOpacity={0.7}
//             onPress={toggle}
//             style={{
//               flexDirection: 'row',
//               justifyContent: 'space-between',
//               alignItems: 'flex-start',
//             }}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontSize: fontScale(tokens.fontSize.lg),
//                 fontWeight: tokens.fontWeight.bold,
//                 paddingHorizontal: moderateScale(tokens.spacing.md2),
//                 marginBottom: moderateScale(tokens.spacing.xsm),
//               }}>
//               {title}
//             </Text>

//             <Animated.View
//               style={{
//                 transform: [
//                   {
//                     rotateZ: animatedHeight.interpolate({
//                       inputRange: [0, 1],
//                       outputRange: ['0deg', '180deg'],
//                     }),
//                   },
//                 ],
//               }}>
//               <Icon
//                 name="keyboard-arrow-down"
//                 size={28}
//                 color={theme.colors.foreground}
//                 style={{paddingHorizontal: moderateScale(tokens.spacing.md2)}}
//               />
//             </Animated.View>
//           </TouchableOpacity>
//         )}

//         <Animated.View
//           style={{
//             opacity: animatedHeight,
//             transform: [
//               {
//                 scaleY: animatedHeight.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [0.96, 1],
//                 }),
//               },
//             ],
//           }}>
//           {open && children}
//         </Animated.View>
//       </View>
//     );
//   };

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
//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [shopResults, setShopResults] = useState<ProductResult[]>([]);

//   const [personalizedVisible, setPersonalizedVisible] = useState(false);
//   const [personalizedPurchases, setPersonalizedPurchases] = useState<any[]>([]);
//   const [showSavedLooks, setShowSavedLooks] = useState(true);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(moderateScale(220))).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const [savedOpen, setSavedOpen] = useState(true);
//   const [createdOpen, setCreatedOpen] = useState(false);
//   const [shoppedOpen, setShoppedOpen] = useState(false);

//   // 🗣️ Enable voice control for HomeScreen
//   useHomeVoiceCommands(setImageModalVisible, setSaveModalVisible, navigate);

//   useEffect(() => {
//     const restoreSectionsState = async () => {
//       try {
//         const saved = await AsyncStorage.getItem('savedLooksOpen');
//         const created = await AsyncStorage.getItem('createdVibeOpen');
//         const shopped = await AsyncStorage.getItem('shoppedVibeOpen');
//         if (saved !== null) setSavedOpen(JSON.parse(saved));
//         if (created !== null) setCreatedOpen(JSON.parse(created));
//         if (shopped !== null) setShoppedOpen(JSON.parse(shopped));
//       } catch (err) {
//         console.error('❌ Failed to restore collapsible states:', err);
//       }
//     };
//     restoreSectionsState();
//   }, []);

//   const {recreateLook, loading: recreating} = useRecreateLook();
//   const [recreatedData, setRecreatedData] = useState<any | null>(null);
//   const [showRecreatedModal, setShowRecreatedModal] = useState(false);

//   const [shopVisible, setShopVisible] = useState(false);
//   const [recentVibes, setRecentVibes] = useState([]);
//   const [loadingVibes, setLoadingVibes] = useState(false);
//   const [recentCreations, setRecentCreations] = useState<any[]>([]);
//   const [loadingCreations, setLoadingCreations] = useState(false);

//   const {width, isXS, isSM, isMD} = useResponsive();

//   // Dynamically compute button width so layout adapts to device width
//   const buttonWidth =
//     isXS || isSM
//       ? (width - 64) / 2 // ➜ 2 columns on small phones like iPhone SE
//       : isMD
//       ? (width - 80) / 3 // ➜ 3 columns on mid-size phones
//       : 160; // ➜ fallback for large phones and tablets

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
//     const restoreSectionsState = async () => {
//       try {
//         const created = await AsyncStorage.getItem('createdVibeOpen');
//         const shopped = await AsyncStorage.getItem('shoppedVibeOpen');
//         if (created !== null) setCreatedOpen(JSON.parse(created));
//         if (shopped !== null) setShoppedOpen(JSON.parse(shopped));
//       } catch (err) {
//         console.error('❌ Failed to restore vibe section states:', err);
//       }
//     };
//     restoreSectionsState();
//   }, []);

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
//     const loadRecentVibes = async () => {
//       if (!userId) return;
//       setLoadingVibes(true);
//       try {
//         console.log('[RecentVibes] Fetching for user:', userId);
//         const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`);
//         const json = await res.json();
//         console.log('[RecentVibes] API Response:', json);

//         if (json?.data?.length) {
//           setRecentVibes(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentVibes(json);
//         } else {
//           console.warn('[RecentVibes] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentVibes] Load failed:', err);
//       } finally {
//         setLoadingVibes(false);
//       }
//     };
//     loadRecentVibes();
//   }, [userId]);

//   useEffect(() => {
//     const loadRecentCreations = async () => {
//       console.log;
//       if (!userId) return;
//       setLoadingCreations(true);
//       try {
//         console.log('[RecentCreations] Fetching for user:', userId);
//         const res = await fetch(
//           `${API_BASE_URL}/users/${userId}/recreated-looks`,
//         );
//         const json = await res.json();
//         console.log('[RecentCreations] API Response:', json);

//         if (json?.data?.length) {
//           setRecentCreations(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentCreations(json);
//         } else {
//           console.warn('[RecentCreations] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentCreations] Load failed:', err);
//       } finally {
//         setLoadingCreations(false);
//       }
//     };
//     loadRecentCreations();
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

//   const openPersonalizedShopModal = (data: PersonalizedResult) => {
//     if (!data) return;

//     const normalized: PersonalizedResult = {
//       recreated_outfit: Array.isArray(data.recreated_outfit)
//         ? [...data.recreated_outfit]
//         : [],
//       suggested_purchases: Array.isArray(data.suggested_purchases)
//         ? [...data.suggested_purchases]
//         : [],
//       style_note: data.style_note ?? '',
//       tags: data.tags ?? [],
//     };

//     console.log('💎 Opening Personalized Shop Modal with:', normalized);

//     setPersonalizedPurchases(JSON.parse(JSON.stringify(normalized)));

//     setTimeout(() => {
//       setPersonalizedVisible(true);
//     }, 100);
//   };

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
//       padding: moderateScale(tokens.spacing.sm),
//       borderRadius: tokens.borderRadius.md,
//     },
//     bannerText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginTop: moderateScale(tokens.spacing.quark),
//     },
//     bodyText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     subtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     dailyLookText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground3,
//       lineHeight: 22,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xsm),
//       marginTop: moderateScale(tokens.spacing.sm2),
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.buttonText1,
//     },
//     quickAccessItem: {
//       alignItems: 'center',
//       width: '40%',
//       minWidth: 140,
//       maxWidth: 185,
//       margin: moderateScale(tokens.spacing.sm),
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
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: moderateScale(tokens.spacing.nano),
//     },
//     weatherDesc: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.foreground2,
//     },
//     weatherTempContainer: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       paddingHorizontal: moderateScale(tokens.spacing.sm2),
//       borderRadius: tokens.borderRadius.md,
//       minWidth: moderateScale(72),
//       alignItems: 'center',
//     },
//     weatherTemp: {
//       fontSize: fontScale(tokens.fontSize['2.5xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.buttonText1,
//     },
//     weatherAdvice: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.bold,
//       color: '#ffd369',
//       marginTop: moderateScale(tokens.spacing.nano),
//       lineHeight: 22,
//       paddingRight: moderateScale(tokens.spacing.sm2),
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     tagText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.xsm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   // 🧥 Recreate Look
//   const handleRecreateLook = async ({image_url, tags}) => {
//     try {
//       console.log('[Home] Recreate from Saved Look:', image_url, tags);
//       const result = await recreateLook({user_id: userId, tags, image_url});
//       console.log('[Home] Recreated outfit result:', result);

//       // 💾 Save recreated look for recall
//       if (userId && result) {
//         try {
//           const payload = {
//             source_image_url: image_url,
//             generated_outfit: result,
//             tags,
//           };
//           console.log('💾 [RecreateSave] POST payload:', payload);

//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/recreated-looks`,
//             {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify(payload),
//             },
//           );

//           const json = await res.json();
//           console.log('💾 [RecreateSave] response:', json);
//         } catch (err) {
//           console.error('❌ [RecreateSave] failed:', err);
//         }
//       }

//       // 👇 Instead of navigation
//       setRecreatedData(result);
//       setShowRecreatedModal(true);
//     } catch (err) {
//       console.error('[Home] Failed to recreate:', err);
//     }
//   };

//   // 🛍️ Shop The Vibe
//   const handleShopModal = async (tags?: string[]) => {
//     try {
//       // ReactNativeHapticFeedback.trigger('impactMedium');
//       console.log('[Home] Shop tags:', tags);

//       const query = tags && tags.length > 0 ? tags.join(' ') : 'outfit';
//       const results = await searchProducts(query);
//       console.log('[Home] Shop results:', results);

//       if (results && results.length > 0) {
//         setShopResults(results); // ✅ saves results to modal state
//         setShopVisible(true); // ✅ opens modal
//       } else {
//         console.warn('[Home] No products found for', query);
//       }
//     } catch (err) {
//       console.error('[Home] Shop modal failed:', err);
//     }
//   };

//   const handleShareVibe = async vibe => {
//     try {
//       ReactNativeHapticFeedback.trigger('impactLight');

//       const imageUri = vibe.source_image_url || vibe.image_url;

//       if (!imageUri) {
//         console.warn('⚠️ No image URL found for vibe:', vibe);
//         Toast.show('This vibe has no image to share ❌', {
//           duration: Toast.durations.SHORT,
//           position: Toast.positions.BOTTOM,
//         });
//         return;
//       }

//       await Share.share({
//         url: imageUri,
//         message: `Just created this vibe ✨ with StylHelpr AI – ${
//           (vibe.tags && vibe.tags.slice(0, 3).join(', ')) ||
//           vibe.query_used ||
//           'New Look'
//         }`,
//         title: 'Share Your Vibe',
//       });

//       Toast.show('Vibe shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing vibe:', err);
//       Toast.show('Error sharing vibe ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

//   return (
//     <GradientBackground>
//       <View style={{flex: 1}}>
//         <Animated.ScrollView
//           // style={[globalStyles.screen]}
//           contentContainerStyle={globalStyles.container}
//           scrollEventThrottle={16}
//           onScroll={Animated.event(
//             [{nativeEvent: {contentOffset: {y: scrollY}}}],
//             {
//               useNativeDriver: true,
//             },
//           )}>
//           {/* Header Row: Greeting + Menu */}
//           <Animatable.View
//             animation="fadeInDown"
//             duration={600}
//             delay={100}
//             useNativeDriver
//             style={{
//               flexDirection: 'row',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//               paddingHorizontal: moderateScale(tokens.spacing.md),
//               marginBottom: moderateScale(tokens.spacing.xxs),
//             }}>
//             <Text
//               style={{
//                 flex: 1,
//                 fontSize: fontScale(tokens.fontSize.base),
//                 fontWeight: tokens.fontWeight.extraBold,
//                 color: theme.colors.foreground,
//               }}
//               numberOfLines={1}
//               ellipsizeMode="tail">
//               {firstName
//                 ? `Hey ${firstName}, Ready to Get Styled Today?`
//                 : 'Hey there, ready to get styled today?'}
//             </Text>

//             <AppleTouchFeedback
//               onPress={() => navigate('Settings')}
//               hapticStyle="impactLight"
//               style={{
//                 padding: moderateScale(tokens.spacing.xxs),
//                 marginLeft: moderateScale(tokens.spacing.xsm),
//               }}>
//               <Icon name="tune" size={22} color={theme.colors.button1} />
//             </AppleTouchFeedback>
//           </Animatable.View>

//           {/* Banner with ambient parallax + reveal */}
//           <View style={{marginBottom: 22}}>
//             <Video
//               source={{uri: 'https://www.w3schools.com/html/mov_bbb.mp4'}}
//               style={{width: '100%', height: 200}}
//               resizeMode="cover"
//               muted={true}
//               volume={0}
//               playInBackground={false}
//               playWhenInactive={false}
//               ignoreSilentSwitch="ignore"
//               repeat
//             />
//           </View>
//           {/* <View style={globalStyles.section}> */}
//           <View style={{marginBottom: 22}}>
//             <Animated.View
//               style={{
//                 // overflow: 'hidden',
//                 // shadowOffset: {width: 0, height: 6},
//                 // shadowOpacity: 0.1,
//                 // shadowRadius: 12,
//                 // elevation: 5,
//                 // borderWidth: tokens.borderWidth.md,
//                 // borderColor: theme.colors.surfaceBorder,
//                 // borderRadius: tokens.borderRadius.xl,
//                 // backgroundColor: theme.colors.surface,
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
//               <Image
//                 source={require('../assets/images/video-still-1.png')}
//                 style={{
//                   width: '100%',
//                   height: moderateScale(200), // scales proportionally across SE → Pro Max
//                 }}
//                 resizeMode="cover"
//               />
//               <Animated.View
//                 style={{
//                   position: 'absolute',
//                   bottom: 10,
//                   left: 10,
//                   right: 16,
//                   backgroundColor: 'rgba(0,0,0,0.45)',
//                   padding: moderateScale(tokens.spacing.sm),
//                   borderRadius: 16,
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
//           </View>

//           {/* 🍎 Weather Section — Clean, Glanceable, Non-Redundant */}
//           {prefs.weather && (
//             <Animatable.View
//               animation="fadeInUp"
//               duration={700}
//               delay={200}
//               useNativeDriver
//               style={globalStyles.section}>
//               <Text style={globalStyles.sectionTitle}>Wedfgather</Text>

//               {weather && (
//                 <View
//                   style={[
//                     globalStyles.cardStyles1,
//                     {
//                       paddingVertical: moderateScale(tokens.spacing.md1),
//                       paddingHorizontal: moderateScale(tokens.spacing.md2),
//                     },
//                   ]}>
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       justifyContent: 'space-between',
//                     }}>
//                     {/* 🌤️ Left column — City, Condition, Icon */}
//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         alignItems: 'center',
//                         flex: 1,
//                       }}>
//                       <Icon
//                         name={(() => {
//                           const condition = weather.celsius.weather[0].main;
//                           if (condition === 'Rain') return 'umbrella';
//                           if (condition === 'Snow') return 'ac-unit';
//                           if (condition === 'Clouds') return 'wb-cloudy';
//                           if (condition === 'Clear') return 'wb-sunny';
//                           return 'wb-sunny';
//                         })()}
//                         size={36}
//                         color={theme.colors.foreground}
//                         style={{marginRight: moderateScale(tokens.spacing.xsm)}}
//                       />
//                       <View>
//                         <Text
//                           style={[
//                             styles.weatherCity,
//                             {
//                               fontSize: fontScale(tokens.fontSize.xl),
//                               fontWeight: tokens.fontWeight.bold,
//                             },
//                           ]}>
//                           {weather.celsius.name}
//                         </Text>
//                         <Text
//                           style={{
//                             fontSize: fontScale(tokens.fontSize.base),
//                             color: theme.colors.foreground2,
//                             textTransform: 'capitalize',
//                           }}>
//                           {weather.celsius.weather[0].description}
//                         </Text>
//                       </View>
//                     </View>

//                     {/* 🌡️ Right column — Big Temp */}
//                     <View
//                       style={[
//                         styles.weatherTempContainer,
//                         // {
//                         //   shadowColor: '#000',
//                         //   shadowOffset: {width: 8, height: 10},
//                         //   shadowOpacity: 0.5,
//                         //   shadowRadius: 5,
//                         //   elevation: 6,
//                         // },
//                       ]}>
//                       <Text
//                         style={{
//                           fontSize: moderateScale(
//                             isXS
//                               ? tokens.fontSize['2.5xl'] // ~28 pt → perfect for SE 3
//                               : isSM
//                               ? tokens.fontSize['3xl'] // ~30 pt → for 13 mini / 12 mini
//                               : isMD
//                               ? tokens.fontSize['3.5xl'] // ~32 pt → for standard 14 / 15
//                               : tokens.fontSize['4xl'], // ~36 pt → for Plus / Pro Max
//                           ),
//                           fontWeight: tokens.fontWeight.extraBold,
//                           color: theme.colors.buttonText1,
//                         }}>
//                         {Math.round(weather.fahrenheit.main.temp)}°F
//                       </Text>
//                     </View>
//                   </View>

//                   {/* 👇 Optional: short vibe line (kept minimal & non-overlapping) */}
//                   <View style={{marginTop: moderateScale(tokens.spacing.sm)}}>
//                     <Text
//                       style={{
//                         fontSize: fontScale(tokens.fontSize.md),
//                         color: theme.colors.foreground2,
//                         fontWeight: tokens.fontWeight.medium,
//                       }}>
//                       {(() => {
//                         const temp = weather.fahrenheit.main.temp;
//                         const condition = weather.celsius.weather[0].main;

//                         if (temp < 25) return '❄️ Brutally Cold';
//                         if (temp < 32)
//                           return condition === 'Snow'
//                             ? '🌨 Freezing & Snowy'
//                             : '🥶 Freezing';
//                         if (temp < 40)
//                           return condition === 'Clouds'
//                             ? '☁️ Bitter & Overcast'
//                             : '🧤 Bitter Cold';
//                         if (temp < 50)
//                           return condition === 'Rain'
//                             ? '🌧 Cold & Wet'
//                             : '🧥 Chilly';
//                         if (temp < 60)
//                           return condition === 'Clouds'
//                             ? '🌥 Cool & Cloudy'
//                             : '🌤 Crisp & Cool';
//                         if (temp < 70)
//                           return condition === 'Clear'
//                             ? '☀️ Mild & Bright'
//                             : '🌤 Mild';
//                         if (temp < 80)
//                           return condition === 'Clear'
//                             ? '☀️ Warm & Clear'
//                             : '🌦 Warm';
//                         if (temp < 90)
//                           return condition === 'Rain'
//                             ? '🌦 Hot & Humid'
//                             : '🔥 Hot';
//                         if (temp < 100) return '🥵 Very Hot';
//                         return '🌋 Extreme Heat';
//                       })()}
//                     </Text>
//                   </View>
//                 </View>
//               )}
//             </Animatable.View>
//           )}

//           {/* AI SUGGESTS SECTION */}
//           {prefs.aiSuggestions &&
//             typeof weather?.fahrenheit?.main?.temp === 'number' && (
//               <AiStylistSuggestions
//                 theme={theme}
//                 weather={weather}
//                 globalStyles={globalStyles}
//                 navigate={navigate}
//                 wardrobe={wardrobe}
//               />
//             )}

//           {/* Map Section — collapsible with animated height & fade */}
//           {prefs.locationMap && (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={700}
//               useNativeDriver
//               style={globalStyles.section}>
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   alignItems: 'center',
//                   justifyContent: 'space-between',
//                 }}>
//                 <Text
//                   style={[
//                     globalStyles.sectionTitle,
//                     {paddingTop: moderateScale(tokens.spacing.nano)},
//                   ]}>
//                   Your Location
//                 </Text>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={toggleMap}
//                   style={{
//                     paddingHorizontal: moderateScale(tokens.spacing.xsm),
//                     // paddingTop: moderateScale(tokens.spacing.xxs),
//                     borderRadius: 20,
//                   }}>
//                   <View style={{flexDirection: 'row', alignItems: 'center'}}>
//                     <Animated.View style={{transform: [{rotateZ}]}}>
//                       <Icon
//                         name="keyboard-arrow-down"
//                         size={30}
//                         color={theme.colors.foreground}
//                       />
//                     </Animated.View>
//                   </View>
//                 </AppleTouchFeedback>
//               </View>

//               <Animated.View
//                 style={{
//                   // marginTop: moderateScale(tokens.spacing.xs),
//                   height: mapHeight,
//                   opacity: mapOpacity,
//                   overflow: 'hidden',
//                 }}>
//                 <View
//                   style={[
//                     globalStyles.cardStyles1,
//                     {
//                       padding: 1,
//                       borderColor: theme.colors.surfaceBorder,
//                       overflow: 'hidden',
//                     },
//                   ]}>
//                   {prefs.locationEnabled && (
//                     <LiveLocationMap
//                       height={moderateScale(220)}
//                       useCustomPin={false}
//                       postHeartbeat={false}
//                     />
//                   )}
//                 </View>
//               </Animated.View>
//             </Animatable.View>
//           )}

//           {/* Quick Access Section */}
//           {prefs.quickAccess && (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={500}
//               duration={700}
//               useNativeDriver
//               style={globalStyles.centeredSection}>
//               <View style={globalStyles.section}>
//                 <Text style={globalStyles.sectionTitle}>Quick Access</Text>
//                 <View style={[globalStyles.centeredSection]}>
//                   <View
//                     style={[
//                       globalStyles.cardStyles1,
//                       {
//                         padding: moderateScale(tokens.spacing.md2),
//                         justifyContent: 'space-between',
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         width: '100%',
//                       },
//                     ]}>
//                     {[
//                       {label: 'Style Me', screen: 'Outfit'},
//                       {label: 'Wardrobe', screen: 'Wardrobe'},
//                       {label: 'Add Clothes', screen: 'AddItem'},
//                       {label: 'Profile', screen: 'Profile'},
//                     ].map((btn, idx) => (
//                       <Animatable.View
//                         key={btn.screen}
//                         animation="zoomIn"
//                         delay={600 + idx * 100}
//                         duration={500}
//                         useNativeDriver
//                         style={{
//                           width: buttonWidth, // already computed responsively above
//                           marginBottom:
//                             idx < 2 ? moderateScale(tokens.spacing.md) : 0,
//                         }}>
//                         <AppleTouchFeedback
//                           style={[
//                             globalStyles.buttonPrimary,
//                             {
//                               width: '100%',
//                               justifyContent: 'center',
//                             },
//                           ]}
//                           hapticStyle="impactHeavy"
//                           onPress={() => navigate(btn.screen)}>
//                           <Text style={globalStyles.buttonPrimaryText}>
//                             {btn.label}
//                           </Text>
//                         </AppleTouchFeedback>
//                       </Animatable.View>
//                     ))}
//                   </View>
//                 </View>
//               </View>
//             </Animatable.View>
//           )}

//           {/* Top Fashion Stories / News Carousel */}
//           {prefs.topFashionStories && (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={600}
//               duration={700}
//               useNativeDriver
//               style={globalStyles.sectionScroll2}>
//               <Text style={[globalStyles.sectionTitle]}>
//                 Top Fashion Stories
//               </Text>
//               <NewsCarousel onOpenArticle={openArticle} />
//             </Animatable.View>
//           )}

//           {/* Discover / Recommended Items */}
//           {prefs.recommendedItems && (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={700}
//               duration={700}
//               useNativeDriver
//               style={globalStyles.sectionScroll2}>
//               <Text style={[globalStyles.sectionTitle]}>Recommended Items</Text>
//               <DiscoverCarousel onOpenItem={openArticle} />
//             </Animatable.View>
//           )}

//           {prefs.inspiredLooks && (
//             <>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle,
//                   {
//                     marginLeft: moderateScale(tokens.spacing.md2),
//                     marginBottom: moderateScale(tokens.spacing.md),
//                   },
//                 ]}>
//                 Your Inspired Looks
//               </Text>

//               {/* SAVED LOOKS SECTION */}
//               {(savedLooks.length > 0 || true) && ( // ✅ always show the section
//                 <CollapsibleSection
//                   title="Saved Looks"
//                   open={savedOpen}
//                   onToggle={async newState => {
//                     setSavedOpen(newState);
//                     await AsyncStorage.setItem(
//                       'savedLooksOpen',
//                       JSON.stringify(newState),
//                     );
//                   }}>
//                   <Animatable.View
//                     animation="fadeInUp"
//                     delay={800}
//                     duration={700}
//                     useNativeDriver
//                     style={[
//                       globalStyles.sectionScroll,
//                       {marginBottom: moderateScale(tokens.spacing.sm)},
//                     ]}>
//                     {savedLooks.length === 0 ? (
//                       <View
//                         style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                         <Text style={globalStyles.missingDataMessage1}>
//                           No saved looks.
//                         </Text>
//                         <TooltipBubble
//                           message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                           position="top"
//                         />
//                       </View>
//                     ) : (
//                       <ScrollView
//                         horizontal
//                         showsHorizontalScrollIndicator={false}
//                         contentContainerStyle={{
//                           paddingRight: moderateScale(tokens.spacing.xs),
//                         }}>
//                         {savedLooks.map((look, index) => (
//                           <Animatable.View
//                             key={look.id}
//                             animation="fadeInUp"
//                             delay={900 + index * 100}
//                             useNativeDriver
//                             style={globalStyles.outfitCard}>
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={() => {
//                                 setSelectedLook(look);
//                                 setPreviewVisible(true);
//                               }}
//                               style={{alignItems: 'center'}}>
//                               <View>
//                                 <Image
//                                   source={{uri: look.image_url}}
//                                   style={[globalStyles.image8]}
//                                   resizeMode="cover"
//                                 />
//                               </View>
//                               <Text
//                                 style={[globalStyles.subLabel]}
//                                 numberOfLines={1}>
//                                 {look.name}
//                               </Text>
//                             </AppleTouchFeedback>
//                           </Animatable.View>
//                         ))}
//                       </ScrollView>
//                     )}
//                     {savedLooks.length > 0 && (
//                       <AppleTouchFeedback
//                         hapticStyle="impactHeavy"
//                         onPress={() => setImageModalVisible(true)}
//                         style={{
//                           alignSelf: 'flex-end',
//                           marginTop: moderateScale(tokens.spacing.xs),
//                           marginRight: moderateScale(tokens.spacing.sm),
//                         }}>
//                         <Text
//                           style={{
//                             fontSize: fontScale(tokens.fontSize.sm),
//                             color: theme.colors.foreground,
//                             fontWeight: tokens.fontWeight.bold,
//                           }}>
//                           See All Saved Looks
//                         </Text>
//                       </AppleTouchFeedback>
//                     )}
//                   </Animatable.View>

//                   <Animatable.View
//                     animation="fadeInUp"
//                     delay={1000}
//                     duration={700}
//                     useNativeDriver
//                     style={{
//                       alignItems: 'center',
//                       marginBottom: moderateScale(tokens.spacing.md2),
//                     }}>
//                     <AppleTouchFeedback
//                       style={[globalStyles.buttonPrimary4, {width: 90}]}
//                       hapticStyle="impactHeavy"
//                       onPress={() => setSaveModalVisible(true)}>
//                       <Text style={globalStyles.buttonPrimaryText4}>
//                         Add Look
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 </CollapsibleSection>
//               )}

//               {/* RECENTLY CREATED VIBE SECTION*/}
//               {loadingCreations && (
//                 <Animatable.View
//                   animation="fadeIn"
//                   duration={400}
//                   useNativeDriver
//                   style={{
//                     padding: moderateScale(tokens.spacing.md),
//                     alignItems: 'center',
//                   }}>
//                   <Text style={{color: theme.colors.foreground2}}>
//                     Loading recent creations...
//                   </Text>
//                 </Animatable.View>
//               )}

//               {!loadingCreations && recentCreations.length > 0 && (
//                 <CollapsibleSection
//                   title="Recently Created Vibe"
//                   open={createdOpen}
//                   onToggle={async newState => {
//                     setCreatedOpen(newState);
//                     await AsyncStorage.setItem(
//                       'createdVibeOpen',
//                       JSON.stringify(newState),
//                     );
//                   }}>
//                   <Animatable.View
//                     animation="fadeInUp"
//                     delay={150}
//                     duration={600}
//                     useNativeDriver
//                     style={globalStyles.sectionScroll}>
//                     <ScrollView
//                       horizontal
//                       showsHorizontalScrollIndicator={false}>
//                       {recentCreations.map(c => (
//                         <TouchableOpacity
//                           key={c.id}
//                           onPress={() =>
//                             navigate('RecreatedLook', {
//                               data: c.generated_outfit,
//                             })
//                           }
//                           style={globalStyles.outfitCard}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => {
//                               ReactNativeHapticFeedback.trigger('impactLight');
//                               navigate('RecreatedLook', {
//                                 data: c.generated_outfit,
//                               });
//                             }}
//                             style={{alignItems: 'center'}}>
//                             <Image
//                               source={{uri: c.source_image_url}}
//                               style={[globalStyles.image8]}
//                               resizeMode="cover"
//                             />
//                           </AppleTouchFeedback>
//                           {/* 👇 ADD THIS just below the image */}
//                           <TouchableOpacity
//                             onPress={() => handleShareVibe(c)}
//                             style={{
//                               position: 'absolute',
//                               top: 6,
//                               right: 6,
//                               backgroundColor: 'rgba(0,0,0,0.4)',
//                               borderRadius: 20,
//                               padding: moderateScale(tokens.spacing.xxs),
//                             }}>
//                             <Icon
//                               name="ios-share"
//                               size={20}
//                               color={theme.colors.buttonText1}
//                             />
//                           </TouchableOpacity>

//                           <Text
//                             numberOfLines={1}
//                             style={[
//                               globalStyles.subLabel,
//                               {
//                                 marginTop: moderateScale(tokens.spacing.xxs),
//                                 textAlign: 'center',
//                               },
//                             ]}>
//                             {(c.tags && c.tags.slice(0, 3).join(' ')) ||
//                               'AI Look'}
//                           </Text>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </Animatable.View>
//                 </CollapsibleSection>
//               )}

//               {/* RECENTLY SHOPPED VIBES SECTION */}
//               {loadingVibes && (
//                 <Animatable.View
//                   animation="fadeIn"
//                   duration={400}
//                   useNativeDriver
//                   style={{
//                     padding: moderateScale(tokens.spacing.md),
//                     alignItems: 'center',
//                   }}>
//                   <Text style={{color: theme.colors.foreground2}}>
//                     Loading recent vibes...
//                   </Text>
//                 </Animatable.View>
//               )}

//               {!loadingVibes && recentVibes.length > 0 && (
//                 <CollapsibleSection
//                   title="Recently Shopped Vibe"
//                   open={shoppedOpen}
//                   onToggle={async newState => {
//                     setShoppedOpen(newState);
//                     await AsyncStorage.setItem(
//                       'shoppedVibeOpen',
//                       JSON.stringify(newState),
//                     );
//                   }}>
//                   <Animatable.View
//                     animation="fadeInUp"
//                     delay={150}
//                     duration={600}
//                     useNativeDriver
//                     style={globalStyles.sectionScroll}>
//                     <ScrollView
//                       horizontal
//                       showsHorizontalScrollIndicator={false}>
//                       {recentVibes.map((vibe, index) => (
//                         <Animatable.View
//                           key={vibe.id || index}
//                           animation="fadeIn"
//                           delay={200 + index * 80}
//                           duration={400}
//                           useNativeDriver
//                           style={globalStyles.outfitCard}>
//                           <TouchableOpacity
//                             activeOpacity={0.85}
//                             onPress={() => {
//                               ReactNativeHapticFeedback.trigger('impactMedium');
//                               handleShopModal([vibe.query_used]);
//                             }}>
//                             <AppleTouchFeedback
//                               hapticStyle="impactMedium"
//                               onPress={() => {
//                                 ReactNativeHapticFeedback.trigger(
//                                   'impactMedium',
//                                 );
//                                 handleShopModal([vibe.query_used]);
//                               }}
//                               style={{alignItems: 'center'}}>
//                               <Image
//                                 source={{uri: vibe.image_url}}
//                                 style={[globalStyles.image8]}
//                                 resizeMode="cover"
//                               />
//                               {/* 👇 Add share button */}
//                               <TouchableOpacity
//                                 onPress={() => handleShareVibe(vibe)}
//                                 style={{
//                                   position: 'absolute',
//                                   top: 6,
//                                   right: 6,
//                                   backgroundColor: 'rgba(0,0,0,0.4)',
//                                   borderRadius: 20,
//                                   padding: moderateScale(tokens.spacing.xxs),
//                                 }}>
//                                 <Icon name="ios-share" size={20} color="#fff" />
//                               </TouchableOpacity>
//                             </AppleTouchFeedback>

//                             <Text
//                               numberOfLines={1}
//                               style={[
//                                 globalStyles.subLabel,
//                                 {
//                                   marginTop: moderateScale(tokens.spacing.xxs),
//                                   textAlign: 'center',
//                                 },
//                               ]}>
//                               {vibe.query_used
//                                 ?.split(' ')
//                                 .slice(0, 3)
//                                 .join(' ') || 'Recent'}
//                             </Text>
//                           </TouchableOpacity>
//                         </Animatable.View>
//                       ))}
//                     </ScrollView>
//                   </Animatable.View>
//                 </CollapsibleSection>
//               )}
//             </>
//           )}

//           <SaveLookModal
//             visible={saveModalVisible}
//             onClose={() => setSaveModalVisible(false)}
//           />
//           <SavedLookPreviewModal
//             visible={previewVisible}
//             look={selectedLook}
//             onClose={() => setPreviewVisible(false)}
//           />
//           <ReaderModal
//             visible={readerVisible}
//             url={readerUrl}
//             title={readerTitle}
//             onClose={() => setReaderVisible(false)}
//           />
//           <AllSavedLooksModal
//             visible={imageModalVisible}
//             onClose={() => setImageModalVisible(false)}
//             savedLooks={savedLooks}
//             recreateLook={handleRecreateLook}
//             openShopModal={handleShopModal}
//             shopResults={shopResults}
//             openPersonalizedShopModal={openPersonalizedShopModal} // ✅ add this
//           />
//           <ShopModal
//             visible={shopVisible}
//             onClose={() => setShopVisible(false)}
//             results={shopResults}
//           />

//           {/* <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={personalizedPurchases}
//         /> */}
//           <PersonalizedShopModal
//             visible={personalizedVisible}
//             onClose={() => setPersonalizedVisible(false)}
//             purchases={
//               personalizedPurchases?.purchases ??
//               personalizedPurchases?.suggested_purchases ??
//               []
//             }
//             recreatedOutfit={
//               personalizedPurchases?.recreatedOutfit ??
//               personalizedPurchases?.recreated_outfit ??
//               []
//             }
//             styleNote={
//               personalizedPurchases?.styleNote ??
//               personalizedPurchases?.style_note ??
//               ''
//             }
//           />

//           {showRecreatedModal && recreatedData && (
//             <Modal
//               visible={showRecreatedModal}
//               animationType="slide"
//               transparent={false}
//               presentationStyle="fullScreen"
//               statusBarTranslucent
//               onRequestClose={() => setShowRecreatedModal(false)}>
//               <RecreatedLookScreen
//                 route={{params: {data: recreatedData}}}
//                 navigation={{goBack: () => setShowRecreatedModal(false)}}
//               />
//             </Modal>
//           )}
//         </Animated.ScrollView>
//       </View>
//     </GradientBackground>
//   );
// };

// export default HomeScreen;

////////////////////////

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
  Modal,
  Pressable,
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
import {fontScale, moderateScale} from '../utils/scale';
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
import {Surface} from '../components/LinearGradientComponents/Surface';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import SparkleIcon from '../assets/images/sparkle-icon.png';
// import Future1 from '../assets/images/future-icon1.png';
import AllSavedLooksModal from '../components/AllSavedLooksModal/AllSavedLooksModal';
import {useRecreateLook} from '../hooks/useRecreateLook';
import {searchProducts} from '../services/productSearchClient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {Linking} from 'react-native';
import type {ProductResult} from '../services/productSearchClient';
import ShopModal from '../components/ShopModal/ShopModal';
import {Share} from 'react-native';
import ViewShot from 'react-native-view-shot';
import PersonalizedShopModal from '../components/PersonalizedShopModal/PersonalizedShopModal';
import RecreatedLookScreen from './RecreatedLookScreen';
import {Camera} from 'react-native-vision-camera';
import {useResponsive} from '../hooks/useResponsive';
import LiquidGlassCard from '../components/LiquidGlassCard/LiquidGlassCard';
import {useHomeVoiceCommands} from '../utils/VoiceUtils/VoiceContext';
import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

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

  const insets = useSafeAreaInsets();
  const MAP_BASE_HEIGHT = moderateScale(250); // allow more breathing room

  useEffect(() => {
    (async () => {
      const status = await Camera.getCameraPermissionStatus();
      console.log('🔒 Camera permission status:', status);
      if (status !== 'authorized') {
        const newStatus = await Camera.requestCameraPermission();
        console.log('🔓 New camera permission:', newStatus);
      }
    })();
  }, []);

  // Simple inline collapsible wrapper — smooth open/close animation
  const CollapsibleSection: React.FC<{
    title?: string;
    children: React.ReactNode;
    open: boolean;
    onToggle: (newState: boolean) => void;
  }> = ({title, children, open, onToggle}) => {
    const animatedHeight = useRef(new Animated.Value(open ? 1 : 0)).current;

    useEffect(() => {
      Animated.timing(animatedHeight, {
        toValue: open ? 1 : 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }, [open]);

    const toggle = () => {
      onToggle(!open);
    };

    return (
      <View
        style={{
          overflow: 'hidden',
          marginBottom: open ? 4 : 20,
        }}>
        {title && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggle}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: moderateScale(tokens.spacing.xs),
            }}>
            <Text
              style={{
                color: theme.colors.foreground,
                fontSize: fontScale(tokens.fontSize.lg),
                fontWeight: tokens.fontWeight.bold,
                paddingHorizontal: moderateScale(tokens.spacing.md2),
              }}>
              {title}
            </Text>

            <Animated.View
              style={{
                transform: [
                  {
                    rotateZ: animatedHeight.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    }),
                  },
                ],
                marginRight: 24,
              }}>
              <View
                style={{
                  backgroundColor: theme.colors.surface3,
                  borderRadius: 50,
                  padding: 1,
                }}>
                <Icon
                  name="keyboard-arrow-down"
                  size={25}
                  color={theme.colors.foreground}
                />
              </View>
            </Animated.View>
          </TouchableOpacity>
        )}

        <Animated.View
          style={{
            opacity: animatedHeight,
            transform: [
              {
                scaleY: animatedHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
          }}>
          {open && children}
        </Animated.View>
      </View>
    );
  };

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
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [shopResults, setShopResults] = useState<ProductResult[]>([]);

  const [personalizedVisible, setPersonalizedVisible] = useState(false);
  const [personalizedPurchases, setPersonalizedPurchases] = useState<any[]>([]);
  const [showSavedLooks, setShowSavedLooks] = useState(true);

  // Map dropdown state & animations
  // DEAFULT OPEN STATE
  const [mapVisible, setMapVisible] = useState(true);
  const chevron = useRef(new Animated.Value(1)).current;
  const mapHeight = useRef(new Animated.Value(MAP_BASE_HEIGHT)).current;
  const mapOpacity = useRef(new Animated.Value(1)).current;
  const [mapOpen, setMapOpen] = useState(true);

  const [savedOpen, setSavedOpen] = useState(true);
  const [createdOpen, setCreatedOpen] = useState(false);
  const [shoppedOpen, setShoppedOpen] = useState(false);

  // 🗣️ Enable voice control for HomeScreen
  useHomeVoiceCommands(setImageModalVisible, setSaveModalVisible, navigate);

  useEffect(() => {
    const restoreSectionsState = async () => {
      try {
        const saved = await AsyncStorage.getItem('savedLooksOpen');
        const created = await AsyncStorage.getItem('createdVibeOpen');
        const shopped = await AsyncStorage.getItem('shoppedVibeOpen');
        if (saved !== null) setSavedOpen(JSON.parse(saved));
        if (created !== null) setCreatedOpen(JSON.parse(created));
        if (shopped !== null) setShoppedOpen(JSON.parse(shopped));
      } catch (err) {
        console.error('❌ Failed to restore collapsible states:', err);
      }
    };
    restoreSectionsState();
  }, []);

  const {recreateLook, loading: recreating} = useRecreateLook();
  const [recreatedData, setRecreatedData] = useState<any | null>(null);
  const [showRecreatedModal, setShowRecreatedModal] = useState(false);

  const [shopVisible, setShopVisible] = useState(false);
  const [recentVibes, setRecentVibes] = useState([]);
  const [loadingVibes, setLoadingVibes] = useState(false);
  const [recentCreations, setRecentCreations] = useState<any[]>([]);
  const [loadingCreations, setLoadingCreations] = useState(false);

  const {width, isXS, isSM, isMD} = useResponsive();

  // Dynamically compute button width so layout adapts to device width
  const buttonWidth =
    isXS || isSM
      ? (width - 64) / 2 // ➜ 2 columns on small phones like iPhone SE
      : isMD
      ? (width - 80) / 3 // ➜ 3 columns on mid-size phones
      : 160; // ➜ fallback for large phones and tablets

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
    const restoreSectionsState = async () => {
      try {
        const created = await AsyncStorage.getItem('createdVibeOpen');
        const shopped = await AsyncStorage.getItem('shoppedVibeOpen');
        if (created !== null) setCreatedOpen(JSON.parse(created));
        if (shopped !== null) setShoppedOpen(JSON.parse(shopped));
      } catch (err) {
        console.error('❌ Failed to restore vibe section states:', err);
      }
    };
    restoreSectionsState();
  }, []);

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
    const loadRecentVibes = async () => {
      if (!userId) return;
      setLoadingVibes(true);
      try {
        console.log('[RecentVibes] Fetching for user:', userId);
        const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`);
        const json = await res.json();
        console.log('[RecentVibes] API Response:', json);

        if (json?.data?.length) {
          setRecentVibes(json.data);
        } else if (Array.isArray(json)) {
          setRecentVibes(json);
        } else {
          console.warn('[RecentVibes] Unexpected shape:', json);
        }
      } catch (err) {
        console.error('[RecentVibes] Load failed:', err);
      } finally {
        setLoadingVibes(false);
      }
    };
    loadRecentVibes();
  }, [userId]);

  useEffect(() => {
    const loadRecentCreations = async () => {
      console.log;
      if (!userId) return;
      setLoadingCreations(true);
      try {
        console.log('[RecentCreations] Fetching for user:', userId);
        const res = await fetch(
          `${API_BASE_URL}/users/${userId}/recreated-looks`,
        );
        const json = await res.json();
        console.log('[RecentCreations] API Response:', json);

        if (json?.data?.length) {
          setRecentCreations(json.data);
        } else if (Array.isArray(json)) {
          setRecentCreations(json);
        } else {
          console.warn('[RecentCreations] Unexpected shape:', json);
        }
      } catch (err) {
        console.error('[RecentCreations] Load failed:', err);
      } finally {
        setLoadingCreations(false);
      }
    };
    loadRecentCreations();
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

  const openPersonalizedShopModal = (data: PersonalizedResult) => {
    if (!data) return;

    const normalized: PersonalizedResult = {
      recreated_outfit: Array.isArray(data.recreated_outfit)
        ? [...data.recreated_outfit]
        : [],
      suggested_purchases: Array.isArray(data.suggested_purchases)
        ? [...data.suggested_purchases]
        : [],
      style_note: data.style_note ?? '',
      tags: data.tags ?? [],
    };

    console.log('💎 Opening Personalized Shop Modal with:', normalized);

    setPersonalizedPurchases(JSON.parse(JSON.stringify(normalized)));

    setTimeout(() => {
      setPersonalizedVisible(true);
    }, 100);
  };

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
          toValue: MAP_BASE_HEIGHT,
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
      padding: moderateScale(tokens.spacing.sm),
      borderRadius: tokens.borderRadius.md,
    },
    bannerText: {
      fontSize: fontScale(tokens.fontSize.base),
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    bannerSubtext: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginTop: moderateScale(tokens.spacing.quark),
    },
    bodyText: {
      fontSize: fontScale(tokens.fontSize.base),
      fontWeight: tokens.fontWeight.medium,
      color: theme.colors.foreground,
    },
    subtext: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: tokens.fontWeight.medium,
      color: theme.colors.foreground,
    },
    dailyLookText: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: tokens.fontWeight.medium,
      color: theme.colors.foreground3,
      lineHeight: 22,
    },
    tryButton: {
      backgroundColor: theme.colors.button1,
      paddingVertical: moderateScale(tokens.spacing.xsm),
      marginTop: moderateScale(tokens.spacing.sm2),
      alignItems: 'center',
    },
    tryButtonText: {
      fontSize: fontScale(tokens.fontSize.lg),
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.buttonText1,
    },
    quickAccessItem: {
      alignItems: 'center',
      width: '40%',
      minWidth: 140,
      maxWidth: 185,
      margin: moderateScale(tokens.spacing.sm),
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
      fontSize: fontScale(tokens.fontSize.base),
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginBottom: moderateScale(tokens.spacing.nano),
    },
    weatherDesc: {
      fontSize: fontScale(tokens.fontSize.sm),
      color: theme.colors.foreground2,
    },
    weatherTempContainer: {
      backgroundColor: theme.colors.button1,
      paddingVertical: moderateScale(tokens.spacing.xxs),
      paddingHorizontal: moderateScale(tokens.spacing.sm2),
      borderRadius: tokens.borderRadius.xl,
      minWidth: moderateScale(72),
      alignItems: 'center',
    },
    weatherTemp: {
      fontSize: fontScale(tokens.fontSize['2.5xl']),
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.buttonText1,
    },
    weatherAdvice: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: tokens.fontWeight.bold,
      color: '#ffd369',
      marginTop: moderateScale(tokens.spacing.nano),
      lineHeight: 22,
      paddingRight: moderateScale(tokens.spacing.sm2),
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: moderateScale(tokens.spacing.sm),
      paddingVertical: moderateScale(tokens.spacing.xxs),
      borderRadius: 20,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    tagText: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    tooltip: {
      position: 'absolute',
      top: -38,
      backgroundColor: 'rgba(28,28,30,0.95)',
      paddingHorizontal: moderateScale(tokens.spacing.xsm),
      paddingVertical: moderateScale(tokens.spacing.xxs),
      borderRadius: 8,
      maxWidth: 180,
      zIndex: 999,
    },
    tooltipText: {
      color: theme.colors.buttonText1,
      fontSize: fontScale(tokens.fontSize.sm),
      textAlign: 'center',
    },
    quickTooltip: {
      position: 'absolute',
      bottom: 60,
      backgroundColor: 'rgba(28,28,30,0.95)',
      paddingHorizontal: moderateScale(tokens.spacing.sm),
      paddingVertical: moderateScale(tokens.spacing.xs),
      borderRadius: 8,
      maxWidth: 180,
      zIndex: 999,
    },
    quickTooltipText: {
      color: theme.colors.buttonText1,
      fontSize: fontScale(tokens.fontSize.sm),
      textAlign: 'center',
    },
  });

  if (!ready) {
    return <View style={globalStyles.screen} />;
  }

  // 🧥 Recreate Look
  const handleRecreateLook = async ({image_url, tags}) => {
    try {
      console.log('[Home] Recreate from Saved Look:', image_url, tags);
      const result = await recreateLook({user_id: userId, tags, image_url});
      console.log('[Home] Recreated outfit result:', result);

      // 💾 Save recreated look for recall
      if (userId && result) {
        try {
          const payload = {
            source_image_url: image_url,
            generated_outfit: result,
            tags,
          };
          console.log('💾 [RecreateSave] POST payload:', payload);

          const res = await fetch(
            `${API_BASE_URL}/users/${userId}/recreated-looks`,
            {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(payload),
            },
          );

          const json = await res.json();
          console.log('💾 [RecreateSave] response:', json);
        } catch (err) {
          console.error('❌ [RecreateSave] failed:', err);
        }
      }

      // 👇 Instead of navigation
      setRecreatedData(result);
      setShowRecreatedModal(true);
    } catch (err) {
      console.error('[Home] Failed to recreate:', err);
    }
  };

  // 🛍️ Shop The Vibe
  const handleShopModal = async (tags?: string[]) => {
    try {
      // ReactNativeHapticFeedback.trigger('impactMedium');
      console.log('[Home] Shop tags:', tags);

      const query = tags && tags.length > 0 ? tags.join(' ') : 'outfit';
      const results = await searchProducts(query);
      console.log('[Home] Shop results:', results);

      if (results && results.length > 0) {
        setShopResults(results); // ✅ saves results to modal state
        setShopVisible(true); // ✅ opens modal
      } else {
        console.warn('[Home] No products found for', query);
      }
    } catch (err) {
      console.error('[Home] Shop modal failed:', err);
    }
  };

  const handleShareVibe = async vibe => {
    try {
      ReactNativeHapticFeedback.trigger('impactLight');

      const imageUri = vibe.source_image_url || vibe.image_url;

      if (!imageUri) {
        console.warn('⚠️ No image URL found for vibe:', vibe);
        Toast.show('This vibe has no image to share ❌', {
          duration: Toast.durations.SHORT,
          position: Toast.positions.BOTTOM,
        });
        return;
      }

      await Share.share({
        url: imageUri,
        message: `Just created this vibe ✨ with StylHelpr AI – ${
          (vibe.tags && vibe.tags.slice(0, 3).join(', ')) ||
          vibe.query_used ||
          'New Look'
        }`,
        title: 'Share Your Vibe',
      });

      Toast.show('Vibe shared successfully ✅', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });
    } catch (err) {
      console.error('❌ Error sharing vibe:', err);
      Toast.show('Error sharing vibe ❌', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });
    }
  };

  return (
    // <GradientBackground>
    <View style={{flex: 1, backgroundColor: theme.colors.background}}>
      <Animated.ScrollView
        // style={[globalStyles.screen]}
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
            paddingHorizontal: moderateScale(tokens.spacing.md),
            marginBottom: moderateScale(tokens.spacing.xxs),
          }}>
          <Text
            style={{
              flex: 1,
              fontSize: fontScale(tokens.fontSize.base),
              fontWeight: tokens.fontWeight.extraBold,
              color: theme.colors.foreground,
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
            style={{
              padding: moderateScale(tokens.spacing.xxs),
              marginLeft: moderateScale(tokens.spacing.xsm),
            }}>
            <Icon name="tune" size={22} color={theme.colors.button1} />
          </AppleTouchFeedback>
        </Animatable.View>

        {/* Banner with ambient parallax + reveal */}
        {/* <View style={globalStyles.section}> */}
        <View
          style={{
            marginBottom: 22,
            paddingHorizontal: moderateScale(tokens.spacing.md1),
          }}>
          <Animated.View
            style={{
              overflow: 'hidden',

              borderWidth: tokens.borderWidth.hairline,
              borderColor: theme.colors.surfaceBorder,
              borderRadius: tokens.borderRadius.xxl,

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
              style={{
                width: '100%',
                height: moderateScale(200), // scales proportionally across SE → Pro Max
              }}
              resizeMode="cover"
            />
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                right: 16,
                backgroundColor: 'rgba(0,0,0,0.45)',
                padding: moderateScale(tokens.spacing.sm),
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

        {/* 🍎 Weather Section — Clean, Glanceable, Non-Redundant */}
        {prefs.weather && (
          <Animatable.View
            animation="fadeInUp"
            duration={700}
            delay={200}
            useNativeDriver
            style={globalStyles.section}>
            <Text style={globalStyles.sectionTitle}>Wedfgather</Text>

            {weather && (
              <View
                style={[
                  globalStyles.cardStyles1,
                  {
                    paddingVertical: moderateScale(tokens.spacing.md1),
                    paddingHorizontal: moderateScale(tokens.spacing.md2),
                  },
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
                      style={{marginRight: moderateScale(tokens.spacing.xsm)}}
                    />
                    <View>
                      <Text
                        style={[
                          styles.weatherCity,
                          {
                            fontSize: fontScale(tokens.fontSize.xl),
                            fontWeight: tokens.fontWeight.bold,
                          },
                        ]}>
                        {weather.celsius.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: fontScale(tokens.fontSize.base),
                          color: theme.colors.foreground2,
                          textTransform: 'capitalize',
                        }}>
                        {weather.celsius.weather[0].description}
                      </Text>
                    </View>
                  </View>

                  {/* 🌡️ Right column — Big Temp */}
                  <View
                    style={[
                      styles.weatherTempContainer,
                      // {
                      //   shadowColor: '#000',
                      //   shadowOffset: {width: 8, height: 10},
                      //   shadowOpacity: 0.5,
                      //   shadowRadius: 5,
                      //   elevation: 6,
                      // },
                    ]}>
                    <Text
                      style={{
                        fontSize: moderateScale(
                          isXS
                            ? tokens.fontSize['2.5xl'] // ~28 pt → perfect for SE 3
                            : isSM
                            ? tokens.fontSize['3xl'] // ~30 pt → for 13 mini / 12 mini
                            : isMD
                            ? tokens.fontSize['3.5xl'] // ~32 pt → for standard 14 / 15
                            : tokens.fontSize['4xl'], // ~36 pt → for Plus / Pro Max
                        ),
                        fontWeight: tokens.fontWeight.extraBold,
                        color: theme.colors.buttonText1,
                      }}>
                      {Math.round(weather.fahrenheit.main.temp)}°F
                    </Text>
                  </View>
                </View>

                {/* 👇 Optional: short vibe line (kept minimal & non-overlapping) */}
                <View style={{marginTop: moderateScale(tokens.spacing.sm)}}>
                  <Text
                    style={{
                      fontSize: fontScale(tokens.fontSize.md),
                      color: theme.colors.foreground2,
                      fontWeight: tokens.fontWeight.medium,
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
            style={[
              globalStyles.section,
              {
                marginBottom: mapOpen
                  ? moderateScale(tokens.spacing.quark)
                  : moderateScale(20), // collapse extra gap when closed
              },
            ]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text
                style={[
                  globalStyles.sectionTitle,
                  {paddingTop: moderateScale(tokens.spacing.nano)},
                ]}>
                Location
              </Text>
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={toggleMap}
                style={{
                  paddingHorizontal: moderateScale(tokens.spacing.xsm),
                }}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Animated.View style={{transform: [{rotateZ}]}}>
                    <Icon
                      name="keyboard-arrow-down"
                      size={30}
                      color={theme.colors.foreground}
                    />
                  </Animated.View>
                </View>
              </AppleTouchFeedback>
            </View>

            <Animated.View
              style={{
                height: mapHeight,
                opacity: mapOpacity,
                overflow: 'hidden',
              }}>
              <View
                style={[
                  {
                    borderWidth: tokens.borderWidth.hairline,
                    borderColor: theme.colors.surfaceBorder,
                    borderRadius: tokens.borderRadius['2xl'],
                    overflow: 'hidden',
                  },
                ]}>
                {prefs.locationEnabled && (
                  <LiveLocationMap
                    height={MAP_BASE_HEIGHT - insets.bottom - moderateScale(10)}
                    useCustomPin={false}
                    postHeartbeat={false}
                  />
                )}
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
                      padding: moderateScale(tokens.spacing.md2),
                      justifyContent: 'space-between',
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
                      style={{
                        width: buttonWidth, // already computed responsively above
                        marginBottom:
                          idx < 2 ? moderateScale(tokens.spacing.md) : 0,
                      }}>
                      <AppleTouchFeedback
                        style={[
                          globalStyles.buttonPrimary,
                          {
                            width: '100%',
                            justifyContent: 'center',
                          },
                        ]}
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
            style={globalStyles.sectionScroll}>
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
            style={globalStyles.sectionScroll}>
            <Text style={[globalStyles.sectionTitle]}>Recommended</Text>
            <DiscoverCarousel onOpenItem={openArticle} />
          </Animatable.View>
        )}

        {prefs.inspiredLooks && (
          <>
            <Text
              style={[
                globalStyles.sectionTitle,
                {
                  marginLeft: moderateScale(tokens.spacing.md2),
                  marginBottom: moderateScale(tokens.spacing.xs),
                },
              ]}>
              Inspired Looks
            </Text>

            {/* SAVED LOOKS SECTION */}
            {(savedLooks.length > 0 || true) && ( // ✅ always show the section
              <CollapsibleSection
                title="Your Saved Looks"
                open={savedOpen}
                onToggle={async newState => {
                  setSavedOpen(newState);
                  await AsyncStorage.setItem(
                    'savedLooksOpen',
                    JSON.stringify(newState),
                  );
                }}>
                <Animatable.View
                  animation="fadeInUp"
                  delay={800}
                  duration={700}
                  useNativeDriver
                  style={[
                    globalStyles.sectionScroll2,
                    {marginBottom: moderateScale(tokens.spacing.sm)},
                  ]}>
                  {savedLooks.length === 0 ? (
                    <View
                      style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
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
                      contentContainerStyle={{
                        paddingRight: moderateScale(tokens.spacing.xs),
                      }}>
                      {savedLooks.map((look, index) => (
                        <Animatable.View
                          key={look.id}
                          animation="fadeInUp"
                          delay={900 + index * 100}
                          useNativeDriver
                          style={globalStyles.outfitCard}>
                          <Pressable
                            onPress={() => {
                              setSelectedLook(look);
                              setPreviewVisible(true);
                            }}
                            style={{alignItems: 'center'}}>
                            <View>
                              <Image
                                source={{uri: look.image_url}}
                                style={[globalStyles.image8]}
                                resizeMode="cover"
                              />
                            </View>
                            <Text
                              style={[
                                globalStyles.subLabel,
                                {marginTop: 4, textAlign: 'center'},
                              ]}
                              numberOfLines={1}>
                              {look.name}
                            </Text>
                          </Pressable>
                        </Animatable.View>
                      ))}
                    </ScrollView>
                  )}
                  {savedLooks.length > 0 && (
                    <Pressable
                      onPress={() => setImageModalVisible(true)}
                      style={{
                        alignSelf: 'flex-end',
                        marginTop: moderateScale(tokens.spacing.xs),
                        marginRight: moderateScale(tokens.spacing.sm),
                      }}>
                      <Text
                        style={{
                          fontSize: fontScale(tokens.fontSize.sm),
                          color: theme.colors.foreground,
                          fontWeight: tokens.fontWeight.bold,
                        }}>
                        See All Saved Looks
                      </Text>
                    </Pressable>
                  )}
                </Animatable.View>

                <Animatable.View
                  animation="fadeInUp"
                  delay={1000}
                  duration={700}
                  useNativeDriver
                  style={{
                    alignItems: 'center',
                    marginBottom: moderateScale(tokens.spacing.md2),
                  }}>
                  <AppleTouchFeedback
                    style={[globalStyles.buttonPrimary4, {width: 90}]}
                    hapticStyle="impactLight"
                    onPress={() => setSaveModalVisible(true)}>
                    <Text style={globalStyles.buttonPrimaryText4}>
                      Add Image
                    </Text>
                  </AppleTouchFeedback>
                </Animatable.View>
              </CollapsibleSection>
            )}

            {/* RECENTLY CREATED VIBE SECTION*/}
            {loadingCreations && (
              <Animatable.View
                animation="fadeIn"
                duration={400}
                useNativeDriver
                style={{
                  padding: moderateScale(tokens.spacing.md),
                  alignItems: 'center',
                }}>
                <Text style={{color: theme.colors.foreground2}}>
                  Loading recent creations...
                </Text>
              </Animatable.View>
            )}

            {!loadingCreations && recentCreations.length > 0 && (
              <CollapsibleSection
                title="Recently Created Looks"
                open={createdOpen}
                onToggle={async newState => {
                  setCreatedOpen(newState);
                  await AsyncStorage.setItem(
                    'createdVibeOpen',
                    JSON.stringify(newState),
                  );
                }}>
                <Animatable.View
                  animation="fadeInUp"
                  delay={150}
                  duration={600}
                  useNativeDriver
                  style={globalStyles.sectionScroll2}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {recentCreations.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() =>
                          navigate('RecreatedLook', {
                            data: c.generated_outfit,
                          })
                        }
                        style={globalStyles.outfitCard}>
                        <Pressable
                          onPress={() => {
                            navigate('RecreatedLook', {
                              data: c.generated_outfit,
                            });
                          }}
                          style={{alignItems: 'center'}}>
                          <Image
                            source={{uri: c.source_image_url}}
                            style={[globalStyles.image8]}
                            resizeMode="cover"
                          />
                        </Pressable>
                        {/* 👇 ADD THIS just below the image */}
                        <TouchableOpacity
                          onPress={() => handleShareVibe(c)}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            borderRadius: 20,
                            padding: 6,
                          }}>
                          <Icon
                            name="ios-share"
                            size={20}
                            color={theme.colors.buttonText1}
                          />
                        </TouchableOpacity>

                        <Text
                          numberOfLines={1}
                          style={[
                            globalStyles.subLabel,
                            {marginTop: 4, textAlign: 'center'},
                          ]}>
                          {(c.tags && c.tags.slice(0, 3).join(' ')) ||
                            'AI Look'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Animatable.View>
              </CollapsibleSection>
            )}

            {/* RECENTLY SHOPPED VIBES SECTION */}
            {loadingVibes && (
              <Animatable.View
                animation="fadeIn"
                duration={400}
                useNativeDriver
                style={{
                  padding: moderateScale(tokens.spacing.md),
                  alignItems: 'center',
                }}>
                <Text style={{color: theme.colors.foreground2}}>
                  Loading recent vibes...
                </Text>
              </Animatable.View>
            )}

            {!loadingVibes && recentVibes.length > 0 && (
              <CollapsibleSection
                title="Recently Shopped Looks"
                open={shoppedOpen}
                onToggle={async newState => {
                  setShoppedOpen(newState);
                  await AsyncStorage.setItem(
                    'shoppedVibeOpen',
                    JSON.stringify(newState),
                  );
                }}>
                <Animatable.View
                  animation="fadeInUp"
                  delay={150}
                  duration={600}
                  useNativeDriver
                  style={globalStyles.sectionScroll}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {recentVibes.map((vibe, index) => (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                          handleShopModal([vibe.query_used]);
                        }}
                        style={globalStyles.outfitCard}>
                        <Pressable
                          onPress={() => {
                            handleShopModal([vibe.query_used]);
                          }}
                          style={{alignItems: 'center'}}>
                          <Image
                            source={{uri: vibe.image_url}}
                            style={[globalStyles.image8]}
                            resizeMode="cover"
                          />
                        </Pressable>
                        {/* 👇 Add share button */}
                        <TouchableOpacity
                          onPress={() => handleShareVibe(vibe)}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            borderRadius: 20,
                            padding: moderateScale(tokens.spacing.xxs),
                          }}>
                          <Icon name="ios-share" size={20} color="#fff" />
                        </TouchableOpacity>

                        <Text
                          numberOfLines={1}
                          style={[
                            globalStyles.subLabel,
                            {marginTop: 4, textAlign: 'center'},
                          ]}>
                          {vibe.query_used?.split(' ').slice(0, 3).join(' ') ||
                            'Recent'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Animatable.View>
              </CollapsibleSection>
            )}
          </>
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
        <AllSavedLooksModal
          visible={imageModalVisible}
          onClose={() => setImageModalVisible(false)}
          savedLooks={savedLooks}
          recreateLook={handleRecreateLook}
          openShopModal={handleShopModal}
          shopResults={shopResults}
          openPersonalizedShopModal={openPersonalizedShopModal} // ✅ add this
        />
        <ShopModal
          visible={shopVisible}
          onClose={() => setShopVisible(false)}
          results={shopResults}
        />

        {/* <PersonalizedShopModal
          visible={personalizedVisible}
          onClose={() => setPersonalizedVisible(false)}
          purchases={personalizedPurchases}
        /> */}
        <PersonalizedShopModal
          visible={personalizedVisible}
          onClose={() => setPersonalizedVisible(false)}
          purchases={
            personalizedPurchases?.purchases ??
            personalizedPurchases?.suggested_purchases ??
            []
          }
          recreatedOutfit={
            personalizedPurchases?.recreatedOutfit ??
            personalizedPurchases?.recreated_outfit ??
            []
          }
          styleNote={
            personalizedPurchases?.styleNote ??
            personalizedPurchases?.style_note ??
            ''
          }
        />

        {showRecreatedModal && recreatedData && (
          <Modal
            visible={showRecreatedModal}
            animationType="slide"
            transparent={false}
            presentationStyle="fullScreen"
            statusBarTranslucent
            onRequestClose={() => setShowRecreatedModal(false)}>
            <RecreatedLookScreen
              route={{params: {data: recreatedData}}}
              navigation={{goBack: () => setShowRecreatedModal(false)}}
            />
          </Modal>
        )}
      </Animated.ScrollView>
    </View>
    // </GradientBackground>
  );
};

export default HomeScreen;

//////////////////

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
//   Modal,
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
// import {fontScale, moderateScale} from '../utils/scale';
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
// import AllSavedLooksModal from '../components/AllSavedLooksModal/AllSavedLooksModal';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {searchProducts} from '../services/productSearchClient';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {Linking} from 'react-native';
// import type {ProductResult} from '../services/productSearchClient';
// import ShopModal from '../components/ShopModal/ShopModal';
// import {Share} from 'react-native';
// import ViewShot from 'react-native-view-shot';
// import PersonalizedShopModal from '../components/PersonalizedShopModal/PersonalizedShopModal';
// import RecreatedLookScreen from './RecreatedLookScreen';
// import {Camera} from 'react-native-vision-camera';
// import {useResponsive} from '../hooks/useResponsive';
// import LiquidGlassCard from '../components/LiquidGlassCard/LiquidGlassCard';

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

//   useEffect(() => {
//     (async () => {
//       const status = await Camera.getCameraPermissionStatus();
//       console.log('🔒 Camera permission status:', status);
//       if (status !== 'authorized') {
//         const newStatus = await Camera.requestCameraPermission();
//         console.log('🔓 New camera permission:', newStatus);
//       }
//     })();
//   }, []);

//   // Simple inline collapsible wrapper — smooth open/close animation
//   const CollapsibleSection: React.FC<{
//     title?: string;
//     children: React.ReactNode;
//     open: boolean;
//     onToggle: (newState: boolean) => void;
//   }> = ({title, children, open, onToggle}) => {
//     const animatedHeight = useRef(new Animated.Value(open ? 1 : 0)).current;

//     useEffect(() => {
//       Animated.timing(animatedHeight, {
//         toValue: open ? 1 : 0,
//         duration: 260,
//         easing: Easing.out(Easing.quad),
//         useNativeDriver: false,
//       }).start();
//     }, [open]);

//     const toggle = () => {
//       onToggle(!open);
//     };

//     return (
//       <View
//         style={{
//           overflow: 'hidden',
//           backgroundColor: theme.colors.background,
//           marginBottom: open ? 4 : 20,
//         }}>
//         {title && (
//           <TouchableOpacity
//             activeOpacity={0.7}
//             onPress={toggle}
//             style={{
//               flexDirection: 'row',
//               justifyContent: 'space-between',
//               alignItems: 'flex-start',
//             }}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontSize: fontScale(tokens.fontSize.lg),
//                 fontWeight: tokens.fontWeight.bold,
//                 paddingHorizontal: moderateScale(tokens.spacing.md2),
//                 marginBottom: moderateScale(tokens.spacing.xsm),
//               }}>
//               {title}
//             </Text>

//             <Animated.View
//               style={{
//                 transform: [
//                   {
//                     rotateZ: animatedHeight.interpolate({
//                       inputRange: [0, 1],
//                       outputRange: ['0deg', '180deg'],
//                     }),
//                   },
//                 ],
//               }}>
//               <Icon
//                 name="keyboard-arrow-down"
//                 size={28}
//                 color={theme.colors.foreground}
//                 style={{paddingHorizontal: moderateScale(tokens.spacing.md2)}}
//               />
//             </Animated.View>
//           </TouchableOpacity>
//         )}

//         <Animated.View
//           style={{
//             opacity: animatedHeight,
//             transform: [
//               {
//                 scaleY: animatedHeight.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [0.96, 1],
//                 }),
//               },
//             ],
//           }}>
//           {open && children}
//         </Animated.View>
//       </View>
//     );
//   };

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
//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [shopResults, setShopResults] = useState<ProductResult[]>([]);

//   const [personalizedVisible, setPersonalizedVisible] = useState(false);
//   const [personalizedPurchases, setPersonalizedPurchases] = useState<any[]>([]);
//   const [showSavedLooks, setShowSavedLooks] = useState(true);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(moderateScale(220))).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const [savedOpen, setSavedOpen] = useState(true);
//   const [createdOpen, setCreatedOpen] = useState(false);
//   const [shoppedOpen, setShoppedOpen] = useState(false);

//   useEffect(() => {
//     const restoreSectionsState = async () => {
//       try {
//         const saved = await AsyncStorage.getItem('savedLooksOpen');
//         const created = await AsyncStorage.getItem('createdVibeOpen');
//         const shopped = await AsyncStorage.getItem('shoppedVibeOpen');
//         if (saved !== null) setSavedOpen(JSON.parse(saved));
//         if (created !== null) setCreatedOpen(JSON.parse(created));
//         if (shopped !== null) setShoppedOpen(JSON.parse(shopped));
//       } catch (err) {
//         console.error('❌ Failed to restore collapsible states:', err);
//       }
//     };
//     restoreSectionsState();
//   }, []);

//   const {recreateLook, loading: recreating} = useRecreateLook();
//   const [recreatedData, setRecreatedData] = useState<any | null>(null);
//   const [showRecreatedModal, setShowRecreatedModal] = useState(false);

//   const [shopVisible, setShopVisible] = useState(false);
//   const [recentVibes, setRecentVibes] = useState([]);
//   const [loadingVibes, setLoadingVibes] = useState(false);
//   const [recentCreations, setRecentCreations] = useState<any[]>([]);
//   const [loadingCreations, setLoadingCreations] = useState(false);

//   const {width, isXS, isSM, isMD} = useResponsive();

//   // Dynamically compute button width so layout adapts to device width
//   const buttonWidth =
//     isXS || isSM
//       ? (width - 64) / 2 // ➜ 2 columns on small phones like iPhone SE
//       : isMD
//       ? (width - 80) / 3 // ➜ 3 columns on mid-size phones
//       : 160; // ➜ fallback for large phones and tablets

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
//     const restoreSectionsState = async () => {
//       try {
//         const created = await AsyncStorage.getItem('createdVibeOpen');
//         const shopped = await AsyncStorage.getItem('shoppedVibeOpen');
//         if (created !== null) setCreatedOpen(JSON.parse(created));
//         if (shopped !== null) setShoppedOpen(JSON.parse(shopped));
//       } catch (err) {
//         console.error('❌ Failed to restore vibe section states:', err);
//       }
//     };
//     restoreSectionsState();
//   }, []);

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
//     const loadRecentVibes = async () => {
//       if (!userId) return;
//       setLoadingVibes(true);
//       try {
//         console.log('[RecentVibes] Fetching for user:', userId);
//         const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`);
//         const json = await res.json();
//         console.log('[RecentVibes] API Response:', json);

//         if (json?.data?.length) {
//           setRecentVibes(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentVibes(json);
//         } else {
//           console.warn('[RecentVibes] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentVibes] Load failed:', err);
//       } finally {
//         setLoadingVibes(false);
//       }
//     };
//     loadRecentVibes();
//   }, [userId]);

//   useEffect(() => {
//     const loadRecentCreations = async () => {
//       console.log;
//       if (!userId) return;
//       setLoadingCreations(true);
//       try {
//         console.log('[RecentCreations] Fetching for user:', userId);
//         const res = await fetch(
//           `${API_BASE_URL}/users/${userId}/recreated-looks`,
//         );
//         const json = await res.json();
//         console.log('[RecentCreations] API Response:', json);

//         if (json?.data?.length) {
//           setRecentCreations(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentCreations(json);
//         } else {
//           console.warn('[RecentCreations] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentCreations] Load failed:', err);
//       } finally {
//         setLoadingCreations(false);
//       }
//     };
//     loadRecentCreations();
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

//   const openPersonalizedShopModal = (data: PersonalizedResult) => {
//     if (!data) return;

//     const normalized: PersonalizedResult = {
//       recreated_outfit: Array.isArray(data.recreated_outfit)
//         ? [...data.recreated_outfit]
//         : [],
//       suggested_purchases: Array.isArray(data.suggested_purchases)
//         ? [...data.suggested_purchases]
//         : [],
//       style_note: data.style_note ?? '',
//       tags: data.tags ?? [],
//     };

//     console.log('💎 Opening Personalized Shop Modal with:', normalized);

//     setPersonalizedPurchases(JSON.parse(JSON.stringify(normalized)));

//     setTimeout(() => {
//       setPersonalizedVisible(true);
//     }, 100);
//   };

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
//       padding: moderateScale(tokens.spacing.sm),
//       borderRadius: tokens.borderRadius.md,
//     },
//     bannerText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginTop: moderateScale(tokens.spacing.quark),
//     },
//     bodyText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     subtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     dailyLookText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground3,
//       lineHeight: 22,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xsm),
//       marginTop: moderateScale(tokens.spacing.sm2),
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.buttonText1,
//     },
//     quickAccessItem: {
//       alignItems: 'center',
//       width: '40%',
//       minWidth: 140,
//       maxWidth: 185,
//       margin: moderateScale(tokens.spacing.sm),
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
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: moderateScale(tokens.spacing.nano),
//     },
//     weatherDesc: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.foreground2,
//     },
//     weatherTempContainer: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       paddingHorizontal: moderateScale(tokens.spacing.sm2),
//       borderRadius: tokens.borderRadius.md,
//       minWidth: moderateScale(72),
//       alignItems: 'center',
//     },
//     weatherTemp: {
//       fontSize: fontScale(tokens.fontSize['2.5xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.buttonText1,
//     },
//     weatherAdvice: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.bold,
//       color: '#ffd369',
//       marginTop: moderateScale(tokens.spacing.nano),
//       lineHeight: 22,
//       paddingRight: moderateScale(tokens.spacing.sm2),
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     tagText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.xsm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   // 🧥 Recreate Look
//   const handleRecreateLook = async ({image_url, tags}) => {
//     try {
//       console.log('[Home] Recreate from Saved Look:', image_url, tags);
//       const result = await recreateLook({user_id: userId, tags, image_url});
//       console.log('[Home] Recreated outfit result:', result);

//       // 💾 Save recreated look for recall
//       if (userId && result) {
//         try {
//           const payload = {
//             source_image_url: image_url,
//             generated_outfit: result,
//             tags,
//           };
//           console.log('💾 [RecreateSave] POST payload:', payload);

//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/recreated-looks`,
//             {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify(payload),
//             },
//           );

//           const json = await res.json();
//           console.log('💾 [RecreateSave] response:', json);
//         } catch (err) {
//           console.error('❌ [RecreateSave] failed:', err);
//         }
//       }

//       // 👇 Instead of navigation
//       setRecreatedData(result);
//       setShowRecreatedModal(true);
//     } catch (err) {
//       console.error('[Home] Failed to recreate:', err);
//     }
//   };

//   // 🛍️ Shop The Vibe
//   const handleShopModal = async (tags?: string[]) => {
//     try {
//       // ReactNativeHapticFeedback.trigger('impactMedium');
//       console.log('[Home] Shop tags:', tags);

//       const query = tags && tags.length > 0 ? tags.join(' ') : 'outfit';
//       const results = await searchProducts(query);
//       console.log('[Home] Shop results:', results);

//       if (results && results.length > 0) {
//         setShopResults(results); // ✅ saves results to modal state
//         setShopVisible(true); // ✅ opens modal
//       } else {
//         console.warn('[Home] No products found for', query);
//       }
//     } catch (err) {
//       console.error('[Home] Shop modal failed:', err);
//     }
//   };

//   const handleShareVibe = async vibe => {
//     try {
//       ReactNativeHapticFeedback.trigger('impactLight');

//       const imageUri = vibe.source_image_url || vibe.image_url;

//       if (!imageUri) {
//         console.warn('⚠️ No image URL found for vibe:', vibe);
//         Toast.show('This vibe has no image to share ❌', {
//           duration: Toast.durations.SHORT,
//           position: Toast.positions.BOTTOM,
//         });
//         return;
//       }

//       await Share.share({
//         url: imageUri,
//         message: `Just created this vibe ✨ with StylHelpr AI – ${
//           (vibe.tags && vibe.tags.slice(0, 3).join(', ')) ||
//           vibe.query_used ||
//           'New Look'
//         }`,
//         title: 'Share Your Vibe',
//       });

//       Toast.show('Vibe shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing vibe:', err);
//       Toast.show('Error sharing vibe ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

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
//             paddingHorizontal: moderateScale(tokens.spacing.md),
//             marginBottom: moderateScale(tokens.spacing.xxs),
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: fontScale(tokens.fontSize.base),
//               fontWeight: tokens.fontWeight.extraBold,
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
//             style={{
//               padding: moderateScale(tokens.spacing.xxs),
//               marginLeft: moderateScale(tokens.spacing.xsm),
//             }}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* Banner with ambient parallax + reveal */}
//         {/* <View style={globalStyles.section}> */}
//         <View style={{marginBottom: 22}}>
//           <Animated.View
//             style={{
//               // overflow: 'hidden',
//               // shadowOffset: {width: 0, height: 6},
//               // shadowOpacity: 0.1,
//               // shadowRadius: 12,
//               // elevation: 5,
//               // borderWidth: tokens.borderWidth.md,
//               // borderColor: theme.colors.surfaceBorder,
//               // borderRadius: tokens.borderRadius.xl,
//               // backgroundColor: theme.colors.surface,
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
//               style={{
//                 width: '100%',
//                 height: moderateScale(200), // scales proportionally across SE → Pro Max
//               }}
//               resizeMode="cover"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: moderateScale(tokens.spacing.sm),
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

//         {/* 🍎 Weather Section — Clean, Glanceable, Non-Redundant */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>

//             {weather && (
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     paddingVertical: moderateScale(tokens.spacing.md1),
//                     paddingHorizontal: moderateScale(tokens.spacing.md2),
//                   },
//                 ]}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   {/* 🌤️ Left column — City, Condition, Icon */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       flex: 1,
//                     }}>
//                     <Icon
//                       name={(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain') return 'umbrella';
//                         if (condition === 'Snow') return 'ac-unit';
//                         if (condition === 'Clouds') return 'wb-cloudy';
//                         if (condition === 'Clear') return 'wb-sunny';
//                         return 'wb-sunny';
//                       })()}
//                       size={36}
//                       color={theme.colors.foreground}
//                       style={{marginRight: moderateScale(tokens.spacing.xsm)}}
//                     />
//                     <View>
//                       <Text
//                         style={[
//                           styles.weatherCity,
//                           {
//                             fontSize: fontScale(tokens.fontSize.xl),
//                             fontWeight: tokens.fontWeight.bold,
//                           },
//                         ]}>
//                         {weather.celsius.name}
//                       </Text>
//                       <Text
//                         style={{
//                           fontSize: fontScale(tokens.fontSize.base),
//                           color: theme.colors.foreground2,
//                           textTransform: 'capitalize',
//                         }}>
//                         {weather.celsius.weather[0].description}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* 🌡️ Right column — Big Temp */}
//                   <View
//                     style={[
//                       styles.weatherTempContainer,
//                       // {
//                       //   shadowColor: '#000',
//                       //   shadowOffset: {width: 8, height: 10},
//                       //   shadowOpacity: 0.5,
//                       //   shadowRadius: 5,
//                       //   elevation: 6,
//                       // },
//                     ]}>
//                     <Text
//                       style={{
//                         fontSize: moderateScale(
//                           isXS
//                             ? tokens.fontSize['2.5xl'] // ~28 pt → perfect for SE 3
//                             : isSM
//                             ? tokens.fontSize['3xl'] // ~30 pt → for 13 mini / 12 mini
//                             : isMD
//                             ? tokens.fontSize['3.5xl'] // ~32 pt → for standard 14 / 15
//                             : tokens.fontSize['4xl'], // ~36 pt → for Plus / Pro Max
//                         ),
//                         fontWeight: tokens.fontWeight.extraBold,
//                         color: theme.colors.buttonText1,
//                       }}>
//                       {Math.round(weather.fahrenheit.main.temp)}°F
//                     </Text>
//                   </View>
//                 </View>

//                 {/* 👇 Optional: short vibe line (kept minimal & non-overlapping) */}
//                 <View style={{marginTop: moderateScale(tokens.spacing.sm)}}>
//                   <Text
//                     style={{
//                       fontSize: fontScale(tokens.fontSize.md),
//                       color: theme.colors.foreground2,
//                       fontWeight: tokens.fontWeight.medium,
//                     }}>
//                     {(() => {
//                       const temp = weather.fahrenheit.main.temp;
//                       const condition = weather.celsius.weather[0].main;

//                       if (temp < 25) return '❄️ Brutally Cold';
//                       if (temp < 32)
//                         return condition === 'Snow'
//                           ? '🌨 Freezing & Snowy'
//                           : '🥶 Freezing';
//                       if (temp < 40)
//                         return condition === 'Clouds'
//                           ? '☁️ Bitter & Overcast'
//                           : '🧤 Bitter Cold';
//                       if (temp < 50)
//                         return condition === 'Rain'
//                           ? '🌧 Cold & Wet'
//                           : '🧥 Chilly';
//                       if (temp < 60)
//                         return condition === 'Clouds'
//                           ? '🌥 Cool & Cloudy'
//                           : '🌤 Crisp & Cool';
//                       if (temp < 70)
//                         return condition === 'Clear'
//                           ? '☀️ Mild & Bright'
//                           : '🌤 Mild';
//                       if (temp < 80)
//                         return condition === 'Clear'
//                           ? '☀️ Warm & Clear'
//                           : '🌦 Warm';
//                       if (temp < 90)
//                         return condition === 'Rain'
//                           ? '🌦 Hot & Humid'
//                           : '🔥 Hot';
//                       if (temp < 100) return '🥵 Very Hot';
//                       return '🌋 Extreme Heat';
//                     })()}
//                   </Text>
//                 </View>
//               </View>
//             )}
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
//               <Text
//                 style={[
//                   globalStyles.sectionTitle,
//                   {paddingTop: moderateScale(tokens.spacing.nano)},
//                 ]}>
//                 Your Location
//               </Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: moderateScale(tokens.spacing.xsm),
//                   // paddingTop: moderateScale(tokens.spacing.xxs),
//                   borderRadius: 20,
//                 }}>
//                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={30}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 // marginTop: moderateScale(tokens.spacing.xs),
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
//                 {prefs.locationEnabled && (
//                   <LiveLocationMap
//                     height={moderateScale(220)}
//                     useCustomPin={false}
//                     postHeartbeat={false}
//                   />
//                 )}
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
//                       padding: moderateScale(tokens.spacing.md2),
//                       justifyContent: 'space-between',
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
//                       style={{
//                         width: buttonWidth, // already computed responsively above
//                         marginBottom:
//                           idx < 2 ? moderateScale(tokens.spacing.md) : 0,
//                       }}>
//                       <AppleTouchFeedback
//                         style={[
//                           globalStyles.buttonPrimary,
//                           {
//                             width: '100%',
//                             justifyContent: 'center',
//                           },
//                         ]}
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

//         {prefs.inspiredLooks && (
//           <>
//             <Text
//               style={[
//                 globalStyles.sectionTitle,
//                 {
//                   marginLeft: moderateScale(tokens.spacing.md2),
//                   marginBottom: moderateScale(tokens.spacing.md),
//                 },
//               ]}>
//               Your Inspired Looks
//             </Text>

//             {/* SAVED LOOKS SECTION */}
//             {(savedLooks.length > 0 || true) && ( // ✅ always show the section
//               <CollapsibleSection
//                 title="Saved Looks"
//                 open={savedOpen}
//                 onToggle={async newState => {
//                   setSavedOpen(newState);
//                   await AsyncStorage.setItem(
//                     'savedLooksOpen',
//                     JSON.stringify(newState),
//                   );
//                 }}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={800}
//                   duration={700}
//                   useNativeDriver
//                   style={[
//                     globalStyles.sectionScroll,
//                     {marginBottom: moderateScale(tokens.spacing.sm)},
//                   ]}>
//                   {savedLooks.length === 0 ? (
//                     <View
//                       style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                       <Text style={globalStyles.missingDataMessage1}>
//                         No saved looks.
//                       </Text>
//                       <TooltipBubble
//                         message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                         position="top"
//                       />
//                     </View>
//                   ) : (
//                     <ScrollView
//                       horizontal
//                       showsHorizontalScrollIndicator={false}
//                       contentContainerStyle={{
//                         paddingRight: moderateScale(tokens.spacing.xs),
//                       }}>
//                       {savedLooks.map((look, index) => (
//                         <Animatable.View
//                           key={look.id}
//                           animation="fadeInUp"
//                           delay={900 + index * 100}
//                           useNativeDriver
//                           style={globalStyles.outfitCard}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => {
//                               setSelectedLook(look);
//                               setPreviewVisible(true);
//                             }}
//                             style={{alignItems: 'center'}}>
//                             <View>
//                               <Image
//                                 source={{uri: look.image_url}}
//                                 style={[globalStyles.image8]}
//                                 resizeMode="cover"
//                               />
//                             </View>
//                             <Text
//                               style={[globalStyles.subLabel]}
//                               numberOfLines={1}>
//                               {look.name}
//                             </Text>
//                           </AppleTouchFeedback>
//                         </Animatable.View>
//                       ))}
//                     </ScrollView>
//                   )}
//                   {savedLooks.length > 0 && (
//                     <AppleTouchFeedback
//                       hapticStyle="impactHeavy"
//                       onPress={() => setImageModalVisible(true)}
//                       style={{
//                         alignSelf: 'flex-end',
//                         marginTop: moderateScale(tokens.spacing.xs),
//                         marginRight: moderateScale(tokens.spacing.sm),
//                       }}>
//                       <Text
//                         style={{
//                           fontSize: fontScale(tokens.fontSize.sm),
//                           color: theme.colors.foreground,
//                           fontWeight: tokens.fontWeight.bold,
//                         }}>
//                         See All Saved Looks
//                       </Text>
//                     </AppleTouchFeedback>
//                   )}
//                 </Animatable.View>

//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={1000}
//                   duration={700}
//                   useNativeDriver
//                   style={{
//                     alignItems: 'center',
//                     marginBottom: moderateScale(tokens.spacing.md2),
//                   }}>
//                   <AppleTouchFeedback
//                     style={[globalStyles.buttonPrimary4, {width: 90}]}
//                     hapticStyle="impactHeavy"
//                     onPress={() => setSaveModalVisible(true)}>
//                     <Text style={globalStyles.buttonPrimaryText4}>
//                       Add Look
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               </CollapsibleSection>
//             )}

//             {/* RECENTLY CREATED VIBE SECTION*/}
//             {loadingCreations && (
//               <Animatable.View
//                 animation="fadeIn"
//                 duration={400}
//                 useNativeDriver
//                 style={{
//                   padding: moderateScale(tokens.spacing.md),
//                   alignItems: 'center',
//                 }}>
//                 <Text style={{color: theme.colors.foreground2}}>
//                   Loading recent creations...
//                 </Text>
//               </Animatable.View>
//             )}

//             {!loadingCreations && recentCreations.length > 0 && (
//               <CollapsibleSection
//                 title="Recently Created Vibe"
//                 open={createdOpen}
//                 onToggle={async newState => {
//                   setCreatedOpen(newState);
//                   await AsyncStorage.setItem(
//                     'createdVibeOpen',
//                     JSON.stringify(newState),
//                   );
//                 }}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={150}
//                   duration={600}
//                   useNativeDriver
//                   style={globalStyles.section}>
//                   <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                     {recentCreations.map(c => (
//                       <TouchableOpacity
//                         key={c.id}
//                         onPress={() =>
//                           navigate('RecreatedLook', {data: c.generated_outfit})
//                         }
//                         style={globalStyles.outfitCard}>
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() => {
//                             ReactNativeHapticFeedback.trigger('impactLight');
//                             navigate('RecreatedLook', {
//                               data: c.generated_outfit,
//                             });
//                           }}
//                           style={{alignItems: 'center'}}>
//                           <Image
//                             source={{uri: c.source_image_url}}
//                             style={[globalStyles.image8]}
//                             resizeMode="cover"
//                           />
//                         </AppleTouchFeedback>
//                         {/* 👇 ADD THIS just below the image */}
//                         <TouchableOpacity
//                           onPress={() => handleShareVibe(c)}
//                           style={{
//                             position: 'absolute',
//                             top: 6,
//                             right: 6,
//                             backgroundColor: 'rgba(0,0,0,0.4)',
//                             borderRadius: 20,
//                             padding: moderateScale(tokens.spacing.xxs),
//                           }}>
//                           <Icon
//                             name="ios-share"
//                             size={20}
//                             color={theme.colors.buttonText1}
//                           />
//                         </TouchableOpacity>

//                         <Text
//                           numberOfLines={1}
//                           style={[
//                             globalStyles.subLabel,
//                             {
//                               marginTop: moderateScale(tokens.spacing.xxs),
//                               textAlign: 'center',
//                             },
//                           ]}>
//                           {(c.tags && c.tags.slice(0, 3).join(' ')) ||
//                             'AI Look'}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </Animatable.View>
//               </CollapsibleSection>
//             )}

//             {/* RECENTLY SHOPPED VIBES SECTION */}
//             {loadingVibes && (
//               <Animatable.View
//                 animation="fadeIn"
//                 duration={400}
//                 useNativeDriver
//                 style={{
//                   padding: moderateScale(tokens.spacing.md),
//                   alignItems: 'center',
//                 }}>
//                 <Text style={{color: theme.colors.foreground2}}>
//                   Loading recent vibes...
//                 </Text>
//               </Animatable.View>
//             )}

//             {!loadingVibes && recentVibes.length > 0 && (
//               <CollapsibleSection
//                 title="Recently Shopped Vibe"
//                 open={shoppedOpen}
//                 onToggle={async newState => {
//                   setShoppedOpen(newState);
//                   await AsyncStorage.setItem(
//                     'shoppedVibeOpen',
//                     JSON.stringify(newState),
//                   );
//                 }}>
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={150}
//                   duration={600}
//                   useNativeDriver
//                   style={globalStyles.section}>
//                   <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                     {recentVibes.map((vibe, index) => (
//                       <Animatable.View
//                         key={vibe.id || index}
//                         animation="fadeIn"
//                         delay={200 + index * 80}
//                         duration={400}
//                         useNativeDriver
//                         style={globalStyles.outfitCard}>
//                         <TouchableOpacity
//                           activeOpacity={0.85}
//                           onPress={() => {
//                             ReactNativeHapticFeedback.trigger('impactMedium');
//                             handleShopModal([vibe.query_used]);
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactMedium"
//                             onPress={() => {
//                               ReactNativeHapticFeedback.trigger('impactMedium');
//                               handleShopModal([vibe.query_used]);
//                             }}
//                             style={{alignItems: 'center'}}>
//                             <Image
//                               source={{uri: vibe.image_url}}
//                               style={[globalStyles.image8]}
//                               resizeMode="cover"
//                             />
//                             {/* 👇 Add share button */}
//                             <TouchableOpacity
//                               onPress={() => handleShareVibe(vibe)}
//                               style={{
//                                 position: 'absolute',
//                                 top: 6,
//                                 right: 6,
//                                 backgroundColor: 'rgba(0,0,0,0.4)',
//                                 borderRadius: 20,
//                                 padding: moderateScale(tokens.spacing.xxs),
//                               }}>
//                               <Icon name="ios-share" size={20} color="#fff" />
//                             </TouchableOpacity>
//                           </AppleTouchFeedback>

//                           <Text
//                             numberOfLines={1}
//                             style={[
//                               globalStyles.subLabel,
//                               {
//                                 marginTop: moderateScale(tokens.spacing.xxs),
//                                 textAlign: 'center',
//                               },
//                             ]}>
//                             {vibe.query_used
//                               ?.split(' ')
//                               .slice(0, 3)
//                               .join(' ') || 'Recent'}
//                           </Text>
//                         </TouchableOpacity>
//                       </Animatable.View>
//                     ))}
//                   </ScrollView>
//                 </Animatable.View>
//               </CollapsibleSection>
//             )}
//           </>
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
//         <AllSavedLooksModal
//           visible={imageModalVisible}
//           onClose={() => setImageModalVisible(false)}
//           savedLooks={savedLooks}
//           recreateLook={handleRecreateLook}
//           openShopModal={handleShopModal}
//           shopResults={shopResults}
//           openPersonalizedShopModal={openPersonalizedShopModal} // ✅ add this
//         />
//         <ShopModal
//           visible={shopVisible}
//           onClose={() => setShopVisible(false)}
//           results={shopResults}
//         />

//         {/* <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={personalizedPurchases}
//         /> */}
//         <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={
//             personalizedPurchases?.purchases ??
//             personalizedPurchases?.suggested_purchases ??
//             []
//           }
//           recreatedOutfit={
//             personalizedPurchases?.recreatedOutfit ??
//             personalizedPurchases?.recreated_outfit ??
//             []
//           }
//           styleNote={
//             personalizedPurchases?.styleNote ??
//             personalizedPurchases?.style_note ??
//             ''
//           }
//         />

//         {showRecreatedModal && recreatedData && (
//           <Modal
//             visible={showRecreatedModal}
//             animationType="slide"
//             transparent={false}
//             presentationStyle="fullScreen"
//             statusBarTranslucent
//             onRequestClose={() => setShowRecreatedModal(false)}>
//             <RecreatedLookScreen
//               route={{params: {data: recreatedData}}}
//               navigation={{goBack: () => setShowRecreatedModal(false)}}
//             />
//           </Modal>
//         )}
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

///////////////////////

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
//   Modal,
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
// import {fontScale, moderateScale} from '../utils/scale';
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
// import AllSavedLooksModal from '../components/AllSavedLooksModal/AllSavedLooksModal';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {searchProducts} from '../services/productSearchClient';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {Linking} from 'react-native';
// import type {ProductResult} from '../services/productSearchClient';
// import ShopModal from '../components/ShopModal/ShopModal';
// import {Share} from 'react-native';
// import ViewShot from 'react-native-view-shot';
// import PersonalizedShopModal from '../components/PersonalizedShopModal/PersonalizedShopModal';
// import RecreatedLookScreen from './RecreatedLookScreen';
// import {Camera} from 'react-native-vision-camera';
// import {useResponsive} from '../hooks/useResponsive';

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

//   useEffect(() => {
//     (async () => {
//       const status = await Camera.getCameraPermissionStatus();
//       console.log('🔒 Camera permission status:', status);
//       if (status !== 'authorized') {
//         const newStatus = await Camera.requestCameraPermission();
//         console.log('🔓 New camera permission:', newStatus);
//       }
//     })();
//   }, []);

//   // Simple inline collapsible wrapper — smooth open/close animation
//   const CollapsibleSection: React.FC<{
//     title?: string;
//     children: React.ReactNode;
//     defaultOpen?: boolean;
//   }> = ({title, children, defaultOpen = true}) => {
//     const [open, setOpen] = useState(defaultOpen);
//     const animatedHeight = useRef(
//       new Animated.Value(defaultOpen ? 1 : 0),
//     ).current;

//     const toggle = () => {
//       Animated.timing(animatedHeight, {
//         toValue: open ? 0 : 1,
//         duration: 260,
//         easing: Easing.out(Easing.quad),
//         useNativeDriver: false,
//       }).start(() => setOpen(!open));
//     };

//     const height = animatedHeight.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, 1],
//     });

//     return (
//       <View
//         style={[
//           {
//             overflow: 'hidden',
//             backgroundColor: theme.colors.background,
//             marginBottom: open ? 4 : 20, // ✅ only when collapsed
//           },
//         ]}>
//         <View style={{marginBottom: moderateScale(tokens.spacing.quark)}}>
//           {title && (
//             <TouchableOpacity
//               activeOpacity={0.7}
//               onPress={toggle}
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'flex-start',
//               }}>
//               <Text
//                 style={[
//                   // globalStyles.sectionTitle,
//                   {
//                     color: theme.colors.foreground,
//                     fontSize: fontScale(tokens.fontSize.lg),
//                     fontWeight: '700',
//                     paddingHorizontal: moderateScale(tokens.spacing.md2),
//                     textTransform: 'none',
//                   },
//                 ]}>
//                 {title}
//               </Text>

//               <Animated.View
//                 style={{
//                   transform: [
//                     {
//                       rotateZ: animatedHeight.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: ['0deg', '180deg'],
//                       }),
//                     },
//                   ],
//                 }}>
//                 <Icon
//                   name="keyboard-arrow-down"
//                   size={28}
//                   color={theme.colors.foreground}
//                   style={{paddingHorizontal: moderateScale(tokens.spacing.md2)}}
//                 />
//               </Animated.View>
//             </TouchableOpacity>
//           )}
//         </View>

//         <Animated.View
//           style={{
//             opacity: animatedHeight,
//             transform: [
//               {
//                 scaleY: animatedHeight.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [0.96, 1],
//                 }),
//               },
//             ],
//           }}>
//           {open && children}
//         </Animated.View>
//       </View>
//     );
//   };

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
//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [shopResults, setShopResults] = useState<ProductResult[]>([]);

//   const [personalizedVisible, setPersonalizedVisible] = useState(false);
//   const [personalizedPurchases, setPersonalizedPurchases] = useState<any[]>([]);
//   const [showSavedLooks, setShowSavedLooks] = useState(true);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(moderateScale(220))).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const {recreateLook, loading: recreating} = useRecreateLook();
//   const [recreatedData, setRecreatedData] = useState<any | null>(null);
//   const [showRecreatedModal, setShowRecreatedModal] = useState(false);

//   const [shopVisible, setShopVisible] = useState(false);
//   const [recentVibes, setRecentVibes] = useState([]);
//   const [loadingVibes, setLoadingVibes] = useState(false);
//   const [recentCreations, setRecentCreations] = useState<any[]>([]);
//   const [loadingCreations, setLoadingCreations] = useState(false);

//   const {width, isXS, isSM, isMD} = useResponsive();

//   // Dynamically compute button width so layout adapts to device width
//   const buttonWidth =
//     isXS || isSM
//       ? (width - 64) / 2 // ➜ 2 columns on small phones like iPhone SE
//       : isMD
//       ? (width - 80) / 3 // ➜ 3 columns on mid-size phones
//       : 160; // ➜ fallback for large phones and tablets

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
//     const loadRecentVibes = async () => {
//       if (!userId) return;
//       setLoadingVibes(true);
//       try {
//         console.log('[RecentVibes] Fetching for user:', userId);
//         const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`);
//         const json = await res.json();
//         console.log('[RecentVibes] API Response:', json);

//         if (json?.data?.length) {
//           setRecentVibes(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentVibes(json);
//         } else {
//           console.warn('[RecentVibes] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentVibes] Load failed:', err);
//       } finally {
//         setLoadingVibes(false);
//       }
//     };
//     loadRecentVibes();
//   }, [userId]);

//   useEffect(() => {
//     const loadRecentCreations = async () => {
//       console.log;
//       if (!userId) return;
//       setLoadingCreations(true);
//       try {
//         console.log('[RecentCreations] Fetching for user:', userId);
//         const res = await fetch(
//           `${API_BASE_URL}/users/${userId}/recreated-looks`,
//         );
//         const json = await res.json();
//         console.log('[RecentCreations] API Response:', json);

//         if (json?.data?.length) {
//           setRecentCreations(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentCreations(json);
//         } else {
//           console.warn('[RecentCreations] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentCreations] Load failed:', err);
//       } finally {
//         setLoadingCreations(false);
//       }
//     };
//     loadRecentCreations();
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

//   const openPersonalizedShopModal = (data: PersonalizedResult) => {
//     if (!data) return;

//     const normalized: PersonalizedResult = {
//       recreated_outfit: Array.isArray(data.recreated_outfit)
//         ? [...data.recreated_outfit]
//         : [],
//       suggested_purchases: Array.isArray(data.suggested_purchases)
//         ? [...data.suggested_purchases]
//         : [],
//       style_note: data.style_note ?? '',
//       tags: data.tags ?? [],
//     };

//     console.log('💎 Opening Personalized Shop Modal with:', normalized);

//     setPersonalizedPurchases(JSON.parse(JSON.stringify(normalized)));

//     setTimeout(() => {
//       setPersonalizedVisible(true);
//     }, 100);
//   };

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
//       padding: moderateScale(tokens.spacing.sm),
//       borderRadius: tokens.borderRadius.md,
//     },
//     bannerText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginTop: moderateScale(tokens.spacing.quark),
//     },
//     bodyText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     subtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     dailyLookText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground3,
//       lineHeight: 22,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xsm),
//       marginTop: moderateScale(tokens.spacing.sm2),
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.buttonText1,
//     },
//     quickAccessItem: {
//       alignItems: 'center',
//       width: '40%',
//       minWidth: 140,
//       maxWidth: 185,
//       margin: moderateScale(tokens.spacing.sm),
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
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: moderateScale(tokens.spacing.nano),
//     },
//     weatherDesc: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.foreground2,
//     },
//     weatherTempContainer: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       paddingHorizontal: moderateScale(tokens.spacing.sm2),
//       borderRadius: tokens.borderRadius.md,
//       minWidth: moderateScale(72),
//       alignItems: 'center',
//     },
//     weatherTemp: {
//       fontSize: fontScale(tokens.fontSize['2.5xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.buttonText1,
//     },
//     weatherAdvice: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.bold,
//       color: '#ffd369',
//       marginTop: moderateScale(tokens.spacing.nano),
//       lineHeight: 22,
//       paddingRight: moderateScale(tokens.spacing.sm2),
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     tagText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.xsm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   // 🧥 Recreate Look
//   const handleRecreateLook = async ({image_url, tags}) => {
//     try {
//       console.log('[Home] Recreate from Saved Look:', image_url, tags);
//       const result = await recreateLook({user_id: userId, tags, image_url});
//       console.log('[Home] Recreated outfit result:', result);

//       // 💾 Save recreated look for recall
//       if (userId && result) {
//         try {
//           const payload = {
//             source_image_url: image_url,
//             generated_outfit: result,
//             tags,
//           };
//           console.log('💾 [RecreateSave] POST payload:', payload);

//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/recreated-looks`,
//             {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify(payload),
//             },
//           );

//           const json = await res.json();
//           console.log('💾 [RecreateSave] response:', json);
//         } catch (err) {
//           console.error('❌ [RecreateSave] failed:', err);
//         }
//       }

//       // 👇 Instead of navigation
//       setRecreatedData(result);
//       setShowRecreatedModal(true);
//     } catch (err) {
//       console.error('[Home] Failed to recreate:', err);
//     }
//   };

//   // 🛍️ Shop The Vibe
//   const handleShopModal = async (tags?: string[]) => {
//     try {
//       // ReactNativeHapticFeedback.trigger('impactMedium');
//       console.log('[Home] Shop tags:', tags);

//       const query = tags && tags.length > 0 ? tags.join(' ') : 'outfit';
//       const results = await searchProducts(query);
//       console.log('[Home] Shop results:', results);

//       if (results && results.length > 0) {
//         setShopResults(results); // ✅ saves results to modal state
//         setShopVisible(true); // ✅ opens modal
//       } else {
//         console.warn('[Home] No products found for', query);
//       }
//     } catch (err) {
//       console.error('[Home] Shop modal failed:', err);
//     }
//   };

//   const handleShareVibe = async vibe => {
//     try {
//       ReactNativeHapticFeedback.trigger('impactLight');

//       const imageUri = vibe.source_image_url || vibe.image_url;

//       if (!imageUri) {
//         console.warn('⚠️ No image URL found for vibe:', vibe);
//         Toast.show('This vibe has no image to share ❌', {
//           duration: Toast.durations.SHORT,
//           position: Toast.positions.BOTTOM,
//         });
//         return;
//       }

//       await Share.share({
//         url: imageUri,
//         message: `Just created this vibe ✨ with StylHelpr AI – ${
//           (vibe.tags && vibe.tags.slice(0, 3).join(', ')) ||
//           vibe.query_used ||
//           'New Look'
//         }`,
//         title: 'Share Your Vibe',
//       });

//       Toast.show('Vibe shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing vibe:', err);
//       Toast.show('Error sharing vibe ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

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
//             paddingHorizontal: moderateScale(tokens.spacing.md),
//             marginBottom: moderateScale(tokens.spacing.xxs),
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: fontScale(tokens.fontSize.base),
//               fontWeight: tokens.fontWeight.extraBold,
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
//             style={{
//               padding: moderateScale(tokens.spacing.xxs),
//               marginLeft: moderateScale(tokens.spacing.xsm),
//             }}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

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
//               style={{
//                 width: '100%',
//                 height: moderateScale(200), // scales proportionally across SE → Pro Max
//               }}
//               resizeMode="cover"
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 bottom: 10,
//                 left: 10,
//                 right: 16,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 padding: moderateScale(tokens.spacing.sm),
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

//         {/* 🍎 Weather Section — Clean, Glanceable, Non-Redundant */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>

//             {weather && (
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     paddingVertical: moderateScale(tokens.spacing.md1),
//                     paddingHorizontal: moderateScale(tokens.spacing.md2),
//                   },
//                 ]}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   {/* 🌤️ Left column — City, Condition, Icon */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       flex: 1,
//                     }}>
//                     <Icon
//                       name={(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain') return 'umbrella';
//                         if (condition === 'Snow') return 'ac-unit';
//                         if (condition === 'Clouds') return 'wb-cloudy';
//                         if (condition === 'Clear') return 'wb-sunny';
//                         return 'wb-sunny';
//                       })()}
//                       size={36}
//                       color={theme.colors.foreground}
//                       style={{marginRight: moderateScale(tokens.spacing.xsm)}}
//                     />
//                     <View>
//                       <Text
//                         style={[
//                           styles.weatherCity,
//                           {
//                             fontSize: fontScale(tokens.fontSize.xl),
//                             fontWeight: tokens.fontWeight.bold,
//                           },
//                         ]}>
//                         {weather.celsius.name}
//                       </Text>
//                       <Text
//                         style={{
//                           fontSize: fontScale(tokens.fontSize.base),
//                           color: theme.colors.foreground2,
//                           textTransform: 'capitalize',
//                         }}>
//                         {weather.celsius.weather[0].description}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* 🌡️ Right column — Big Temp */}
//                   <View
//                     style={[
//                       styles.weatherTempContainer,
//                       // {
//                       //   shadowColor: '#000',
//                       //   shadowOffset: {width: 8, height: 10},
//                       //   shadowOpacity: 0.5,
//                       //   shadowRadius: 5,
//                       //   elevation: 6,
//                       // },
//                     ]}>
//                     <Text
//                       style={{
//                         fontSize: moderateScale(
//                           isXS
//                             ? tokens.fontSize['2.5xl'] // ~28 pt → perfect for SE 3
//                             : isSM
//                             ? tokens.fontSize['3xl'] // ~30 pt → for 13 mini / 12 mini
//                             : isMD
//                             ? tokens.fontSize['3.5xl'] // ~32 pt → for standard 14 / 15
//                             : tokens.fontSize['4xl'], // ~36 pt → for Plus / Pro Max
//                         ),
//                         fontWeight: tokens.fontWeight.extraBold,
//                         color: theme.colors.buttonText1,
//                       }}>
//                       {Math.round(weather.fahrenheit.main.temp)}°F
//                     </Text>
//                   </View>
//                 </View>

//                 {/* 👇 Optional: short vibe line (kept minimal & non-overlapping) */}
//                 <View style={{marginTop: moderateScale(tokens.spacing.sm)}}>
//                   <Text
//                     style={{
//                       fontSize: fontScale(tokens.fontSize.md),
//                       color: theme.colors.foreground2,
//                       fontWeight: tokens.fontWeight.medium,
//                     }}>
//                     {(() => {
//                       const temp = weather.fahrenheit.main.temp;
//                       const condition = weather.celsius.weather[0].main;

//                       if (temp < 25) return '❄️ Brutally Cold';
//                       if (temp < 32)
//                         return condition === 'Snow'
//                           ? '🌨 Freezing & Snowy'
//                           : '🥶 Freezing';
//                       if (temp < 40)
//                         return condition === 'Clouds'
//                           ? '☁️ Bitter & Overcast'
//                           : '🧤 Bitter Cold';
//                       if (temp < 50)
//                         return condition === 'Rain'
//                           ? '🌧 Cold & Wet'
//                           : '🧥 Chilly';
//                       if (temp < 60)
//                         return condition === 'Clouds'
//                           ? '🌥 Cool & Cloudy'
//                           : '🌤 Crisp & Cool';
//                       if (temp < 70)
//                         return condition === 'Clear'
//                           ? '☀️ Mild & Bright'
//                           : '🌤 Mild';
//                       if (temp < 80)
//                         return condition === 'Clear'
//                           ? '☀️ Warm & Clear'
//                           : '🌦 Warm';
//                       if (temp < 90)
//                         return condition === 'Rain'
//                           ? '🌦 Hot & Humid'
//                           : '🔥 Hot';
//                       if (temp < 100) return '🥵 Very Hot';
//                       return '🌋 Extreme Heat';
//                     })()}
//                   </Text>
//                 </View>
//               </View>
//             )}
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
//               <Text
//                 style={[
//                   globalStyles.sectionTitle,
//                   {paddingTop: moderateScale(tokens.spacing.nano)},
//                 ]}>
//                 Your Location
//               </Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: moderateScale(tokens.spacing.xsm),
//                   // paddingTop: moderateScale(tokens.spacing.xxs),
//                   borderRadius: 20,
//                 }}>
//                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={30}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 // marginTop: moderateScale(tokens.spacing.xs),
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
//                   height={moderateScale(220)}
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
//                       padding: moderateScale(tokens.spacing.md2),
//                       justifyContent: 'space-between',
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
//                       style={{
//                         width: buttonWidth, // already computed responsively above
//                         marginBottom:
//                           idx < 2 ? moderateScale(tokens.spacing.md) : 0,
//                       }}>
//                       <AppleTouchFeedback
//                         style={[
//                           globalStyles.buttonPrimary,
//                           {
//                             width: '100%',
//                             justifyContent: 'center',
//                           },
//                         ]}
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

//         {prefs.inspiredLooks && (
//           <>
//             <Text
//               style={[
//                 globalStyles.sectionTitle,
//                 {
//                   marginLeft: moderateScale(tokens.spacing.md2),
//                   marginBottom: moderateScale(tokens.spacing.md),
//                 },
//               ]}>
//               Your Inspired Looks
//             </Text>

//             {/* SAVED LOOKS SECTION */}
//             {(savedLooks.length > 0 || true) && ( // ✅ always show the section
//               <CollapsibleSection title="Saved Looks">
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={800}
//                   duration={700}
//                   useNativeDriver
//                   style={[
//                     globalStyles.sectionScroll,
//                     {marginBottom: moderateScale(tokens.spacing.sm)},
//                   ]}>
//                   {savedLooks.length === 0 ? (
//                     <View
//                       style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                       <Text style={globalStyles.missingDataMessage1}>
//                         No saved looks.
//                       </Text>
//                       <TooltipBubble
//                         message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                         position="top"
//                       />
//                     </View>
//                   ) : (
//                     <ScrollView
//                       horizontal
//                       showsHorizontalScrollIndicator={false}
//                       contentContainerStyle={{
//                         paddingRight: moderateScale(tokens.spacing.xs),
//                       }}>
//                       {savedLooks.map((look, index) => (
//                         <Animatable.View
//                           key={look.id}
//                           animation="fadeInUp"
//                           delay={900 + index * 100}
//                           useNativeDriver
//                           style={globalStyles.outfitCard}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => {
//                               setSelectedLook(look);
//                               setPreviewVisible(true);
//                             }}
//                             style={{alignItems: 'center'}}>
//                             <View>
//                               <Image
//                                 source={{uri: look.image_url}}
//                                 style={[
//                                   globalStyles.image4,
//                                   {
//                                     borderColor: theme.colors.surfaceBorder,
//                                     borderWidth: tokens.borderWidth.md,
//                                     borderRadius: tokens.borderRadius.md,
//                                   },
//                                 ]}
//                                 resizeMode="cover"
//                               />
//                             </View>
//                             <Text
//                               style={[globalStyles.subLabel]}
//                               numberOfLines={1}>
//                               {look.name}
//                             </Text>
//                           </AppleTouchFeedback>
//                         </Animatable.View>
//                       ))}
//                     </ScrollView>
//                   )}
//                   {savedLooks.length > 0 && (
//                     <AppleTouchFeedback
//                       hapticStyle="impactHeavy"
//                       onPress={() => setImageModalVisible(true)}
//                       style={{
//                         alignSelf: 'flex-end',
//                         marginTop: moderateScale(tokens.spacing.xs),
//                         marginRight: moderateScale(tokens.spacing.sm),
//                       }}>
//                       <Text
//                         style={{
//                           fontSize: fontScale(tokens.fontSize.sm),
//                           color: theme.colors.foreground,
//                           fontWeight: tokens.fontWeight.bold,
//                         }}>
//                         See All Saved Looks
//                       </Text>
//                     </AppleTouchFeedback>
//                   )}
//                 </Animatable.View>

//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={1000}
//                   duration={700}
//                   useNativeDriver
//                   style={{
//                     alignItems: 'center',
//                     marginBottom: moderateScale(tokens.spacing.md2),
//                   }}>
//                   <AppleTouchFeedback
//                     style={[globalStyles.buttonPrimary4, {width: 90}]}
//                     hapticStyle="impactHeavy"
//                     onPress={() => setSaveModalVisible(true)}>
//                     <Text style={globalStyles.buttonPrimaryText4}>
//                       Add Look
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               </CollapsibleSection>
//             )}

//             {/* RECENTLY CREATED VIBE SECTION*/}
//             {loadingCreations && (
//               <Animatable.View
//                 animation="fadeIn"
//                 duration={400}
//                 useNativeDriver
//                 style={{
//                   padding: moderateScale(tokens.spacing.md),
//                   alignItems: 'center',
//                 }}>
//                 <Text style={{color: theme.colors.foreground2}}>
//                   Loading recent creations...
//                 </Text>
//               </Animatable.View>
//             )}

//             {!loadingCreations && recentCreations.length > 0 && (
//               <CollapsibleSection title="Recently Created Vibe">
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={150}
//                   duration={600}
//                   useNativeDriver
//                   style={globalStyles.section}>
//                   <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                     {recentCreations.map(c => (
//                       <TouchableOpacity
//                         key={c.id}
//                         onPress={() =>
//                           navigate('RecreatedLook', {data: c.generated_outfit})
//                         }
//                         style={globalStyles.outfitCard}>
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() => {
//                             ReactNativeHapticFeedback.trigger('impactLight');
//                             navigate('RecreatedLook', {
//                               data: c.generated_outfit,
//                             });
//                           }}
//                           style={{alignItems: 'center'}}>
//                           <Image
//                             source={{uri: c.source_image_url}}
//                             style={[
//                               globalStyles.image4,
//                               {
//                                 borderColor: theme.colors.surfaceBorder,
//                                 borderWidth: tokens.borderWidth.md,
//                                 borderRadius: tokens.borderRadius.md,
//                               },
//                             ]}
//                             resizeMode="cover"
//                           />
//                         </AppleTouchFeedback>
//                         {/* 👇 ADD THIS just below the image */}
//                         <TouchableOpacity
//                           onPress={() => handleShareVibe(c)}
//                           style={{
//                             position: 'absolute',
//                             top: 6,
//                             right: 6,
//                             backgroundColor: 'rgba(0,0,0,0.4)',
//                             borderRadius: 20,
//                             padding: moderateScale(tokens.spacing.xxs),
//                           }}>
//                           <Icon
//                             name="ios-share"
//                             size={20}
//                             color={theme.colors.buttonText1}
//                           />
//                         </TouchableOpacity>

//                         <Text
//                           numberOfLines={1}
//                           style={[
//                             globalStyles.subLabel,
//                             {
//                               marginTop: moderateScale(tokens.spacing.xxs),
//                               textAlign: 'center',
//                             },
//                           ]}>
//                           {(c.tags && c.tags.slice(0, 3).join(' ')) ||
//                             'AI Look'}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </Animatable.View>
//               </CollapsibleSection>
//             )}

//             {/* RECENTLY SHOPPED VIBES SECTION */}
//             {loadingVibes && (
//               <Animatable.View
//                 animation="fadeIn"
//                 duration={400}
//                 useNativeDriver
//                 style={{
//                   padding: moderateScale(tokens.spacing.md),
//                   alignItems: 'center',
//                 }}>
//                 <Text style={{color: theme.colors.foreground2}}>
//                   Loading recent vibes...
//                 </Text>
//               </Animatable.View>
//             )}

//             {!loadingVibes && recentVibes.length > 0 && (
//               <CollapsibleSection title="Recently Shopped Vibe">
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={150}
//                   duration={600}
//                   useNativeDriver
//                   style={globalStyles.section}>
//                   <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                     {recentVibes.map((vibe, index) => (
//                       <Animatable.View
//                         key={vibe.id || index}
//                         animation="fadeIn"
//                         delay={200 + index * 80}
//                         duration={400}
//                         useNativeDriver
//                         style={globalStyles.outfitCard}>
//                         <TouchableOpacity
//                           activeOpacity={0.85}
//                           onPress={() => {
//                             ReactNativeHapticFeedback.trigger('impactMedium');
//                             handleShopModal([vibe.query_used]);
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactMedium"
//                             onPress={() => {
//                               ReactNativeHapticFeedback.trigger('impactMedium');
//                               handleShopModal([vibe.query_used]);
//                             }}
//                             style={{alignItems: 'center'}}>
//                             <Image
//                               source={{uri: vibe.image_url}}
//                               style={[
//                                 globalStyles.image4,
//                                 {
//                                   borderColor: theme.colors.surfaceBorder,
//                                   borderWidth: tokens.borderWidth.md,
//                                   borderRadius: tokens.borderRadius.md,
//                                 },
//                               ]}
//                               resizeMode="cover"
//                             />
//                             {/* 👇 Add share button */}
//                             <TouchableOpacity
//                               onPress={() => handleShareVibe(vibe)}
//                               style={{
//                                 position: 'absolute',
//                                 top: 6,
//                                 right: 6,
//                                 backgroundColor: 'rgba(0,0,0,0.4)',
//                                 borderRadius: 20,
//                                 padding: moderateScale(tokens.spacing.xxs),
//                               }}>
//                               <Icon name="ios-share" size={20} color="#fff" />
//                             </TouchableOpacity>
//                           </AppleTouchFeedback>

//                           <Text
//                             numberOfLines={1}
//                             style={[
//                               globalStyles.subLabel,
//                               {
//                                 marginTop: moderateScale(tokens.spacing.xxs),
//                                 textAlign: 'center',
//                               },
//                             ]}>
//                             {vibe.query_used
//                               ?.split(' ')
//                               .slice(0, 3)
//                               .join(' ') || 'Recent'}
//                           </Text>
//                         </TouchableOpacity>
//                       </Animatable.View>
//                     ))}
//                   </ScrollView>
//                 </Animatable.View>
//               </CollapsibleSection>
//             )}
//           </>
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
//         <AllSavedLooksModal
//           visible={imageModalVisible}
//           onClose={() => setImageModalVisible(false)}
//           savedLooks={savedLooks}
//           recreateLook={handleRecreateLook}
//           openShopModal={handleShopModal}
//           shopResults={shopResults}
//           openPersonalizedShopModal={openPersonalizedShopModal} // ✅ add this
//         />
//         <ShopModal
//           visible={shopVisible}
//           onClose={() => setShopVisible(false)}
//           results={shopResults}
//         />

//         {/* <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={personalizedPurchases}
//         /> */}
//         <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={
//             personalizedPurchases?.purchases ??
//             personalizedPurchases?.suggested_purchases ??
//             []
//           }
//           recreatedOutfit={
//             personalizedPurchases?.recreatedOutfit ??
//             personalizedPurchases?.recreated_outfit ??
//             []
//           }
//           styleNote={
//             personalizedPurchases?.styleNote ??
//             personalizedPurchases?.style_note ??
//             ''
//           }
//         />

//         {showRecreatedModal && recreatedData && (
//           <Modal
//             visible={showRecreatedModal}
//             animationType="slide"
//             transparent={false}
//             presentationStyle="fullScreen"
//             statusBarTranslucent
//             onRequestClose={() => setShowRecreatedModal(false)}>
//             <RecreatedLookScreen
//               route={{params: {data: recreatedData}}}
//               navigation={{goBack: () => setShowRecreatedModal(false)}}
//             />
//           </Modal>
//         )}
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

///////////////////

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
//   Modal,
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
// import {fontScale, moderateScale} from '../utils/scale';
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
// import AllSavedLooksModal from '../components/AllSavedLooksModal/AllSavedLooksModal';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {searchProducts} from '../services/productSearchClient';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {Linking} from 'react-native';
// import type {ProductResult} from '../services/productSearchClient';
// import ShopModal from '../components/ShopModal/ShopModal';
// import {Share} from 'react-native';
// import ViewShot from 'react-native-view-shot';
// import PersonalizedShopModal from '../components/PersonalizedShopModal/PersonalizedShopModal';
// import RecreatedLookScreen from './RecreatedLookScreen';
// import {Camera} from 'react-native-vision-camera';
// import {useResponsive} from '../hooks/useResponsive';

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

//   useEffect(() => {
//     (async () => {
//       const status = await Camera.getCameraPermissionStatus();
//       console.log('🔒 Camera permission status:', status);
//       if (status !== 'authorized') {
//         const newStatus = await Camera.requestCameraPermission();
//         console.log('🔓 New camera permission:', newStatus);
//       }
//     })();
//   }, []);

//   // Simple inline collapsible wrapper — smooth open/close animation
//   const CollapsibleSection: React.FC<{
//     title?: string;
//     children: React.ReactNode;
//     defaultOpen?: boolean;
//   }> = ({title, children, defaultOpen = true}) => {
//     const [open, setOpen] = useState(defaultOpen);
//     const animatedHeight = useRef(
//       new Animated.Value(defaultOpen ? 1 : 0),
//     ).current;

//     const toggle = () => {
//       Animated.timing(animatedHeight, {
//         toValue: open ? 0 : 1,
//         duration: 260,
//         easing: Easing.out(Easing.quad),
//         useNativeDriver: false,
//       }).start(() => setOpen(!open));
//     };

//     const height = animatedHeight.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, 1],
//     });

//     return (
//       <View
//         style={[
//           {
//             overflow: 'hidden',
//             backgroundColor: theme.colors.background,
//             marginBottom: open ? 4 : 20, // ✅ only when collapsed
//           },
//         ]}>
//         <View style={{marginBottom: moderateScale(tokens.spacing.quark)}}>
//           {title && (
//             <TouchableOpacity
//               activeOpacity={0.7}
//               onPress={toggle}
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'flex-start',
//               }}>
//               <Text
//                 style={[
//                   // globalStyles.sectionTitle,
//                   {
//                     color: theme.colors.foreground,
//                     fontSize: fontScale(tokens.fontSize.lg),
//                     fontWeight: '700',
//                     paddingHorizontal: moderateScale(tokens.spacing.md2),
//                     textTransform: 'none',
//                   },
//                 ]}>
//                 {title}
//               </Text>

//               <Animated.View
//                 style={{
//                   transform: [
//                     {
//                       rotateZ: animatedHeight.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: ['0deg', '180deg'],
//                       }),
//                     },
//                   ],
//                 }}>
//                 <Icon
//                   name="keyboard-arrow-down"
//                   size={28}
//                   color={theme.colors.foreground}
//                   style={{paddingHorizontal: moderateScale(tokens.spacing.md2)}}
//                 />
//               </Animated.View>
//             </TouchableOpacity>
//           )}
//         </View>

//         <Animated.View
//           style={{
//             opacity: animatedHeight,
//             transform: [
//               {
//                 scaleY: animatedHeight.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [0.96, 1],
//                 }),
//               },
//             ],
//           }}>
//           {open && children}
//         </Animated.View>
//       </View>
//     );
//   };

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
//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [shopResults, setShopResults] = useState<ProductResult[]>([]);

//   const [personalizedVisible, setPersonalizedVisible] = useState(false);
//   const [personalizedPurchases, setPersonalizedPurchases] = useState<any[]>([]);
//   const [showSavedLooks, setShowSavedLooks] = useState(true);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const {recreateLook, loading: recreating} = useRecreateLook();
//   const [recreatedData, setRecreatedData] = useState<any | null>(null);
//   const [showRecreatedModal, setShowRecreatedModal] = useState(false);

//   const [shopVisible, setShopVisible] = useState(false);
//   const [recentVibes, setRecentVibes] = useState([]);
//   const [loadingVibes, setLoadingVibes] = useState(false);
//   const [recentCreations, setRecentCreations] = useState<any[]>([]);
//   const [loadingCreations, setLoadingCreations] = useState(false);

//   const {width, isXS, isSM, isMD} = useResponsive();

//   // Dynamically compute button width so layout adapts to device width
//   const buttonWidth =
//     isXS || isSM
//       ? (width - 64) / 2 // ➜ 2 columns on small phones like iPhone SE
//       : isMD
//       ? (width - 80) / 3 // ➜ 3 columns on mid-size phones
//       : 160; // ➜ fallback for large phones and tablets

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
//     const loadRecentVibes = async () => {
//       if (!userId) return;
//       setLoadingVibes(true);
//       try {
//         console.log('[RecentVibes] Fetching for user:', userId);
//         const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`);
//         const json = await res.json();
//         console.log('[RecentVibes] API Response:', json);

//         if (json?.data?.length) {
//           setRecentVibes(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentVibes(json);
//         } else {
//           console.warn('[RecentVibes] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentVibes] Load failed:', err);
//       } finally {
//         setLoadingVibes(false);
//       }
//     };
//     loadRecentVibes();
//   }, [userId]);

//   useEffect(() => {
//     const loadRecentCreations = async () => {
//       console.log;
//       if (!userId) return;
//       setLoadingCreations(true);
//       try {
//         console.log('[RecentCreations] Fetching for user:', userId);
//         const res = await fetch(
//           `${API_BASE_URL}/users/${userId}/recreated-looks`,
//         );
//         const json = await res.json();
//         console.log('[RecentCreations] API Response:', json);

//         if (json?.data?.length) {
//           setRecentCreations(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentCreations(json);
//         } else {
//           console.warn('[RecentCreations] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentCreations] Load failed:', err);
//       } finally {
//         setLoadingCreations(false);
//       }
//     };
//     loadRecentCreations();
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

//   const openPersonalizedShopModal = (data: PersonalizedResult) => {
//     if (!data) return;

//     const normalized: PersonalizedResult = {
//       recreated_outfit: Array.isArray(data.recreated_outfit)
//         ? [...data.recreated_outfit]
//         : [],
//       suggested_purchases: Array.isArray(data.suggested_purchases)
//         ? [...data.suggested_purchases]
//         : [],
//       style_note: data.style_note ?? '',
//       tags: data.tags ?? [],
//     };

//     console.log('💎 Opening Personalized Shop Modal with:', normalized);

//     setPersonalizedPurchases(JSON.parse(JSON.stringify(normalized)));

//     setTimeout(() => {
//       setPersonalizedVisible(true);
//     }, 100);
//   };

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
//       padding: moderateScale(tokens.spacing.sm),
//       borderRadius: tokens.borderRadius.md,
//     },
//     bannerText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginTop: moderateScale(tokens.spacing.quark),
//     },
//     bodyText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     subtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     dailyLookText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground3,
//       lineHeight: 22,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xsm),
//       marginTop: moderateScale(tokens.spacing.sm2),
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.buttonText1,
//     },
//     quickAccessItem: {
//       alignItems: 'center',
//       width: '40%',
//       minWidth: 140,
//       maxWidth: 185,
//       margin: moderateScale(tokens.spacing.sm),
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
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: moderateScale(tokens.spacing.nano),
//     },
//     weatherDesc: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.foreground2,
//     },
//     weatherTempContainer: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       paddingHorizontal: moderateScale(tokens.spacing.sm2),
//       borderRadius: tokens.borderRadius.md,
//       minWidth: moderateScale(72),
//       alignItems: 'center',
//     },
//     weatherTemp: {
//       fontSize: fontScale(tokens.fontSize['2.5xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.buttonText1,
//     },
//     weatherAdvice: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.bold,
//       color: '#ffd369',
//       marginTop: moderateScale(tokens.spacing.nano),
//       lineHeight: 22,
//       paddingRight: moderateScale(tokens.spacing.sm2),
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     tagText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.xsm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   // 🧥 Recreate Look
//   const handleRecreateLook = async ({image_url, tags}) => {
//     try {
//       console.log('[Home] Recreate from Saved Look:', image_url, tags);
//       const result = await recreateLook({user_id: userId, tags, image_url});
//       console.log('[Home] Recreated outfit result:', result);

//       // 💾 Save recreated look for recall
//       if (userId && result) {
//         try {
//           const payload = {
//             source_image_url: image_url,
//             generated_outfit: result,
//             tags,
//           };
//           console.log('💾 [RecreateSave] POST payload:', payload);

//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/recreated-looks`,
//             {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify(payload),
//             },
//           );

//           const json = await res.json();
//           console.log('💾 [RecreateSave] response:', json);
//         } catch (err) {
//           console.error('❌ [RecreateSave] failed:', err);
//         }
//       }

//       // 👇 Instead of navigation
//       setRecreatedData(result);
//       setShowRecreatedModal(true);
//     } catch (err) {
//       console.error('[Home] Failed to recreate:', err);
//     }
//   };

//   // 🛍️ Shop The Vibe
//   const handleShopModal = async (tags?: string[]) => {
//     try {
//       // ReactNativeHapticFeedback.trigger('impactMedium');
//       console.log('[Home] Shop tags:', tags);

//       const query = tags && tags.length > 0 ? tags.join(' ') : 'outfit';
//       const results = await searchProducts(query);
//       console.log('[Home] Shop results:', results);

//       if (results && results.length > 0) {
//         setShopResults(results); // ✅ saves results to modal state
//         setShopVisible(true); // ✅ opens modal
//       } else {
//         console.warn('[Home] No products found for', query);
//       }
//     } catch (err) {
//       console.error('[Home] Shop modal failed:', err);
//     }
//   };

//   const handleShareVibe = async vibe => {
//     try {
//       ReactNativeHapticFeedback.trigger('impactLight');

//       const imageUri = vibe.source_image_url || vibe.image_url;

//       if (!imageUri) {
//         console.warn('⚠️ No image URL found for vibe:', vibe);
//         Toast.show('This vibe has no image to share ❌', {
//           duration: Toast.durations.SHORT,
//           position: Toast.positions.BOTTOM,
//         });
//         return;
//       }

//       await Share.share({
//         url: imageUri,
//         message: `Just created this vibe ✨ with StylHelpr AI – ${
//           (vibe.tags && vibe.tags.slice(0, 3).join(', ')) ||
//           vibe.query_used ||
//           'New Look'
//         }`,
//         title: 'Share Your Vibe',
//       });

//       Toast.show('Vibe shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing vibe:', err);
//       Toast.show('Error sharing vibe ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

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
//             paddingHorizontal: moderateScale(tokens.spacing.md),
//             marginBottom: moderateScale(tokens.spacing.xxs),
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: fontScale(tokens.fontSize.base),
//               fontWeight: tokens.fontWeight.extraBold,
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
//             style={{
//               padding: moderateScale(tokens.spacing.xxs),
//               marginLeft: moderateScale(tokens.spacing.xsm),
//             }}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

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
//                 padding: moderateScale(tokens.spacing.sm),
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

//         {/* 🍎 Weather Section — Clean, Glanceable, Non-Redundant */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>

//             {weather && (
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     paddingVertical: moderateScale(tokens.spacing.md1),
//                     paddingHorizontal: moderateScale(tokens.spacing.md2),
//                   },
//                 ]}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   {/* 🌤️ Left column — City, Condition, Icon */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       flex: 1,
//                     }}>
//                     <Icon
//                       name={(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain') return 'umbrella';
//                         if (condition === 'Snow') return 'ac-unit';
//                         if (condition === 'Clouds') return 'wb-cloudy';
//                         if (condition === 'Clear') return 'wb-sunny';
//                         return 'wb-sunny';
//                       })()}
//                       size={36}
//                       color={theme.colors.foreground}
//                       style={{marginRight: moderateScale(tokens.spacing.xsm)}}
//                     />
//                     <View>
//                       <Text
//                         style={[
//                           styles.weatherCity,
//                           {
//                             fontSize: fontScale(tokens.fontSize.xl),
//                             fontWeight: tokens.fontWeight.bold,
//                           },
//                         ]}>
//                         {weather.celsius.name}
//                       </Text>
//                       <Text
//                         style={{
//                           fontSize: tokens.fontSize.base,
//                           color: theme.colors.foreground2,
//                           textTransform: 'capitalize',
//                         }}>
//                         {weather.celsius.weather[0].description}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* 🌡️ Right column — Big Temp */}
//                   <View
//                     style={[
//                       styles.weatherTempContainer,
//                       // {
//                       //   shadowColor: '#000',
//                       //   shadowOffset: {width: 8, height: 10},
//                       //   shadowOpacity: 0.5,
//                       //   shadowRadius: 5,
//                       //   elevation: 6,
//                       // },
//                     ]}>
//                     <Text
//                       style={{
//                         fontSize: moderateScale(
//                           isXS
//                             ? tokens.fontSize['2.5xl'] // ~28 pt → perfect for SE 3
//                             : isSM
//                             ? tokens.fontSize['3xl'] // ~30 pt → for 13 mini / 12 mini
//                             : isMD
//                             ? tokens.fontSize['3.5xl'] // ~32 pt → for standard 14 / 15
//                             : tokens.fontSize['4xl'], // ~36 pt → for Plus / Pro Max
//                         ),
//                         fontWeight: tokens.fontWeight.extraBold,
//                         color: theme.colors.buttonText1,
//                       }}>
//                       {Math.round(weather.fahrenheit.main.temp)}°F
//                     </Text>
//                   </View>
//                 </View>

//                 {/* 👇 Optional: short vibe line (kept minimal & non-overlapping) */}
//                 <View style={{marginTop: moderateScale(tokens.spacing.sm)}}>
//                   <Text
//                     style={{
//                       fontSize: fontScale(tokens.fontSize.md),
//                       color: theme.colors.foreground2,
//                       fontWeight: tokens.fontWeight.medium,
//                     }}>
//                     {(() => {
//                       const temp = weather.fahrenheit.main.temp;
//                       const condition = weather.celsius.weather[0].main;

//                       if (temp < 25) return '❄️ Brutally Cold';
//                       if (temp < 32)
//                         return condition === 'Snow'
//                           ? '🌨 Freezing & Snowy'
//                           : '🥶 Freezing';
//                       if (temp < 40)
//                         return condition === 'Clouds'
//                           ? '☁️ Bitter & Overcast'
//                           : '🧤 Bitter Cold';
//                       if (temp < 50)
//                         return condition === 'Rain'
//                           ? '🌧 Cold & Wet'
//                           : '🧥 Chilly';
//                       if (temp < 60)
//                         return condition === 'Clouds'
//                           ? '🌥 Cool & Cloudy'
//                           : '🌤 Crisp & Cool';
//                       if (temp < 70)
//                         return condition === 'Clear'
//                           ? '☀️ Mild & Bright'
//                           : '🌤 Mild';
//                       if (temp < 80)
//                         return condition === 'Clear'
//                           ? '☀️ Warm & Clear'
//                           : '🌦 Warm';
//                       if (temp < 90)
//                         return condition === 'Rain'
//                           ? '🌦 Hot & Humid'
//                           : '🔥 Hot';
//                       if (temp < 100) return '🥵 Very Hot';
//                       return '🌋 Extreme Heat';
//                     })()}
//                   </Text>
//                 </View>
//               </View>
//             )}
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
//               <Text
//                 style={[
//                   globalStyles.sectionTitle,
//                   {paddingTop: moderateScale(tokens.spacing.nano)},
//                 ]}>
//                 Your Location
//               </Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: moderateScale(tokens.spacing.xsm),
//                   // paddingTop: moderateScale(tokens.spacing.xxs),
//                   borderRadius: 20,
//                 }}>
//                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={30}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 // marginTop: moderateScale(tokens.spacing.xs),
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
//                       padding: moderateScale(tokens.spacing.md2),
//                       justifyContent: 'space-between',
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
//                       style={{
//                         width: '48%',
//                         marginBottom: idx < 2 ? 20 : 0, // ✅ only apply margin to the first row
//                       }}>
//                       <AppleTouchFeedback
//                         style={[
//                           globalStyles.buttonPrimary,
//                           {
//                             width: '100%',
//                             justifyContent: 'center',
//                           },
//                         ]}
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

//         {prefs.inspiredLooks && (
//           <>
//             <Text
//               style={[
//                 globalStyles.sectionTitle,
//                 {
//                   marginLeft: moderateScale(tokens.spacing.md2),
//                   marginBottom: moderateScale(tokens.spacing.md),
//                 },
//               ]}>
//               Your Inspired Looks
//             </Text>

//             {/* SAVED LOOKS SECTION */}
//             {(savedLooks.length > 0 || true) && ( // ✅ always show the section
//               <CollapsibleSection title="Saved Looks">
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={800}
//                   duration={700}
//                   useNativeDriver
//                   style={[
//                     globalStyles.sectionScroll,
//                     {marginBottom: moderateScale(tokens.spacing.sm)},
//                   ]}>
//                   {savedLooks.length === 0 ? (
//                     <View
//                       style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                       <Text style={globalStyles.missingDataMessage1}>
//                         No saved looks.
//                       </Text>
//                       <TooltipBubble
//                         message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                         position="top"
//                       />
//                     </View>
//                   ) : (
//                     <ScrollView
//                       horizontal
//                       showsHorizontalScrollIndicator={false}
//                       contentContainerStyle={{
//                         paddingRight: moderateScale(tokens.spacing.xs),
//                       }}>
//                       {savedLooks.map((look, index) => (
//                         <Animatable.View
//                           key={look.id}
//                           animation="fadeInUp"
//                           delay={900 + index * 100}
//                           useNativeDriver
//                           style={globalStyles.outfitCard}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => {
//                               setSelectedLook(look);
//                               setPreviewVisible(true);
//                             }}
//                             style={{alignItems: 'center'}}>
//                             <View>
//                               <Image
//                                 source={{uri: look.image_url}}
//                                 style={[
//                                   globalStyles.image4,
//                                   {
//                                     borderColor: theme.colors.surfaceBorder,
//                                     borderWidth: tokens.borderWidth.md,
//                                     borderRadius: tokens.borderRadius.md,
//                                   },
//                                 ]}
//                                 resizeMode="cover"
//                               />
//                             </View>
//                             <Text
//                               style={[globalStyles.subLabel]}
//                               numberOfLines={1}>
//                               {look.name}
//                             </Text>
//                           </AppleTouchFeedback>
//                         </Animatable.View>
//                       ))}
//                     </ScrollView>
//                   )}
//                   {savedLooks.length > 0 && (
//                     <AppleTouchFeedback
//                       hapticStyle="impactHeavy"
//                       onPress={() => setImageModalVisible(true)}
//                       style={{
//                         alignSelf: 'flex-end',
//                         marginTop: moderateScale(tokens.spacing.xs),
//                         marginRight: moderateScale(tokens.spacing.sm),
//                       }}>
//                       <Text
//                         style={{
//                           fontSize: fontScale(tokens.fontSize.sm),
//                           color: theme.colors.foreground,
//                           fontWeight: tokens.fontWeight.bold,
//                         }}>
//                         See All Saved Looks
//                       </Text>
//                     </AppleTouchFeedback>
//                   )}
//                 </Animatable.View>

//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={1000}
//                   duration={700}
//                   useNativeDriver
//                   style={{
//                     alignItems: 'center',
//                     marginBottom: moderateScale(tokens.spacing.md2),
//                   }}>
//                   <AppleTouchFeedback
//                     style={[
//                       globalStyles.buttonPrimary4,
//                       {width: 90},
//                     ]}
//                     hapticStyle="impactHeavy"
//                     onPress={() => setSaveModalVisible(true)}>
//                     <Text style={globalStyles.buttonPrimaryText4}>
//                       Add Look
//                     </Text>
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               </CollapsibleSection>
//             )}

//             {/* RECENTLY CREATED VIBE SECTION*/}
//             {loadingCreations && (
//               <Animatable.View
//                 animation="fadeIn"
//                 duration={400}
//                 useNativeDriver
//                 style={{
//                   padding: moderateScale(tokens.spacing.md),
//                   alignItems: 'center',
//                 }}>
//                 <Text style={{color: theme.colors.foreground2}}>
//                   Loading recent creations...
//                 </Text>
//               </Animatable.View>
//             )}

//             {!loadingCreations && recentCreations.length > 0 && (
//               <CollapsibleSection title="Recently Created Vibe">
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={150}
//                   duration={600}
//                   useNativeDriver
//                   style={globalStyles.section}>
//                   <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                     {recentCreations.map(c => (
//                       <TouchableOpacity
//                         key={c.id}
//                         onPress={() =>
//                           navigate('RecreatedLook', {data: c.generated_outfit})
//                         }
//                         style={globalStyles.outfitCard}>
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() => {
//                             ReactNativeHapticFeedback.trigger('impactLight');
//                             navigate('RecreatedLook', {
//                               data: c.generated_outfit,
//                             });
//                           }}
//                           style={{alignItems: 'center'}}>
//                           <Image
//                             source={{uri: c.source_image_url}}
//                             style={[
//                               globalStyles.image4,
//                               {
//                                 borderColor: theme.colors.surfaceBorder,
//                                 borderWidth: tokens.borderWidth.md,
//                                 borderRadius: tokens.borderRadius.md,
//                               },
//                             ]}
//                             resizeMode="cover"
//                           />
//                         </AppleTouchFeedback>
//                         {/* 👇 ADD THIS just below the image */}
//                         <TouchableOpacity
//                           onPress={() => handleShareVibe(c)}
//                           style={{
//                             position: 'absolute',
//                             top: 6,
//                             right: 6,
//                             backgroundColor: 'rgba(0,0,0,0.4)',
//                             borderRadius: 20,
//                             padding: moderateScale(tokens.spacing.xxs),
//                           }}>
//                           <Icon
//                             name="ios-share"
//                             size={20}
//                             color={theme.colors.buttonText1}
//                           />
//                         </TouchableOpacity>

//                         <Text
//                           numberOfLines={1}
//                           style={[
//                             globalStyles.subLabel,
//                             {
//                               marginTop: moderateScale(tokens.spacing.xxs),
//                               textAlign: 'center',
//                             },
//                           ]}>
//                           {(c.tags && c.tags.slice(0, 3).join(' ')) ||
//                             'AI Look'}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </Animatable.View>
//               </CollapsibleSection>
//             )}

//             {/* RECENTLY SHOPPED VIBES SECTION */}
//             {loadingVibes && (
//               <Animatable.View
//                 animation="fadeIn"
//                 duration={400}
//                 useNativeDriver
//                 style={{
//                   padding: moderateScale(tokens.spacing.md),
//                   alignItems: 'center',
//                 }}>
//                 <Text style={{color: theme.colors.foreground2}}>
//                   Loading recent vibes...
//                 </Text>
//               </Animatable.View>
//             )}

//             {!loadingVibes && recentVibes.length > 0 && (
//               <CollapsibleSection title="Recently Shopped Vibe">
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={150}
//                   duration={600}
//                   useNativeDriver
//                   style={globalStyles.section}>
//                   <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                     {recentVibes.map((vibe, index) => (
//                       <Animatable.View
//                         key={vibe.id || index}
//                         animation="fadeIn"
//                         delay={200 + index * 80}
//                         duration={400}
//                         useNativeDriver
//                         style={globalStyles.outfitCard}>
//                         <TouchableOpacity
//                           activeOpacity={0.85}
//                           onPress={() => {
//                             ReactNativeHapticFeedback.trigger('impactMedium');
//                             handleShopModal([vibe.query_used]);
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactMedium"
//                             onPress={() => {
//                               ReactNativeHapticFeedback.trigger('impactMedium');
//                               handleShopModal([vibe.query_used]);
//                             }}
//                             style={{alignItems: 'center'}}>
//                             <Image
//                               source={{uri: vibe.image_url}}
//                               style={[
//                                 globalStyles.image4,
//                                 {
//                                   borderColor: theme.colors.surfaceBorder,
//                                   borderWidth: tokens.borderWidth.md,
//                                   borderRadius: tokens.borderRadius.md,
//                                 },
//                               ]}
//                               resizeMode="cover"
//                             />
//                             {/* 👇 Add share button */}
//                             <TouchableOpacity
//                               onPress={() => handleShareVibe(vibe)}
//                               style={{
//                                 position: 'absolute',
//                                 top: 6,
//                                 right: 6,
//                                 backgroundColor: 'rgba(0,0,0,0.4)',
//                                 borderRadius: 20,
//                                 padding: moderateScale(tokens.spacing.xxs),
//                               }}>
//                               <Icon name="ios-share" size={20} color="#fff" />
//                             </TouchableOpacity>
//                           </AppleTouchFeedback>

//                           <Text
//                             numberOfLines={1}
//                             style={[
//                               globalStyles.subLabel,
//                               {
//                                 marginTop: moderateScale(tokens.spacing.xxs),
//                                 textAlign: 'center',
//                               },
//                             ]}>
//                             {vibe.query_used
//                               ?.split(' ')
//                               .slice(0, 3)
//                               .join(' ') || 'Recent'}
//                           </Text>
//                         </TouchableOpacity>
//                       </Animatable.View>
//                     ))}
//                   </ScrollView>
//                 </Animatable.View>
//               </CollapsibleSection>
//             )}
//           </>
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
//         <AllSavedLooksModal
//           visible={imageModalVisible}
//           onClose={() => setImageModalVisible(false)}
//           savedLooks={savedLooks}
//           recreateLook={handleRecreateLook}
//           openShopModal={handleShopModal}
//           shopResults={shopResults}
//           openPersonalizedShopModal={openPersonalizedShopModal} // ✅ add this
//         />
//         <ShopModal
//           visible={shopVisible}
//           onClose={() => setShopVisible(false)}
//           results={shopResults}
//         />

//         {/* <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={personalizedPurchases}
//         /> */}
//         <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={
//             personalizedPurchases?.purchases ??
//             personalizedPurchases?.suggested_purchases ??
//             []
//           }
//           recreatedOutfit={
//             personalizedPurchases?.recreatedOutfit ??
//             personalizedPurchases?.recreated_outfit ??
//             []
//           }
//           styleNote={
//             personalizedPurchases?.styleNote ??
//             personalizedPurchases?.style_note ??
//             ''
//           }
//         />

//         {showRecreatedModal && recreatedData && (
//           <Modal
//             visible={showRecreatedModal}
//             animationType="slide"
//             transparent={false}
//             presentationStyle="fullScreen"
//             statusBarTranslucent
//             onRequestClose={() => setShowRecreatedModal(false)}>
//             <RecreatedLookScreen
//               route={{params: {data: recreatedData}}}
//               navigation={{goBack: () => setShowRecreatedModal(false)}}
//             />
//           </Modal>
//         )}
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

///////////////////////

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
//   Modal,
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
// import {fontScale, moderateScale} from '../utils/scale';
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
// import AllSavedLooksModal from '../components/AllSavedLooksModal/AllSavedLooksModal';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {searchProducts} from '../services/productSearchClient';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {Linking} from 'react-native';
// import type {ProductResult} from '../services/productSearchClient';
// import ShopModal from '../components/ShopModal/ShopModal';
// import {Share} from 'react-native';
// import ViewShot from 'react-native-view-shot';
// import PersonalizedShopModal from '../components/PersonalizedShopModal/PersonalizedShopModal';
// import RecreatedLookScreen from './RecreatedLookScreen';
// import {Camera} from 'react-native-vision-camera';
// import {useResponsive} from '../hooks/useResponsive';

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

//   useEffect(() => {
//     (async () => {
//       const status = await Camera.getCameraPermissionStatus();
//       console.log('🔒 Camera permission status:', status);
//       if (status !== 'authorized') {
//         const newStatus = await Camera.requestCameraPermission();
//         console.log('🔓 New camera permission:', newStatus);
//       }
//     })();
//   }, []);

//   // Simple inline collapsible wrapper — smooth open/close animation
//   const CollapsibleSection: React.FC<{
//     title?: string;
//     children: React.ReactNode;
//     defaultOpen?: boolean;
//   }> = ({title, children, defaultOpen = true}) => {
//     const [open, setOpen] = useState(defaultOpen);
//     const animatedHeight = useRef(
//       new Animated.Value(defaultOpen ? 1 : 0),
//     ).current;

//     const toggle = () => {
//       Animated.timing(animatedHeight, {
//         toValue: open ? 0 : 1,
//         duration: 260,
//         easing: Easing.out(Easing.quad),
//         useNativeDriver: false,
//       }).start(() => setOpen(!open));
//     };

//     const height = animatedHeight.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, 1],
//     });

//     return (
//       <View
//         style={[
//           {
//             overflow: 'hidden',
//             backgroundColor: theme.colors.background,
//             marginBottom: open ? 4 : 20, // ✅ only when collapsed
//           },
//         ]}>
//         <View style={{marginBottom: moderateScale(tokens.spacing.quark)}}>
//           {title && (
//             <TouchableOpacity
//               activeOpacity={0.7}
//               onPress={toggle}
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'flex-start',
//               }}>
//               <Text
//                 style={[
//                   // globalStyles.sectionTitle,
//                   {
//                     color: theme.colors.foreground,
//                     fontSize: fontScale(tokens.fontSize.lg),
//                     fontWeight: '700',
//                     paddingHorizontal: moderateScale(tokens.spacing.md2),
//                     textTransform: 'none',
//                   },
//                 ]}>
//                 {title}
//               </Text>

//               <Animated.View
//                 style={{
//                   transform: [
//                     {
//                       rotateZ: animatedHeight.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: ['0deg', '180deg'],
//                       }),
//                     },
//                   ],
//                 }}>
//                 <Icon
//                   name="keyboard-arrow-down"
//                   size={28}
//                   color={theme.colors.foreground}
//                   style={{paddingHorizontal: moderateScale(tokens.spacing.md2)}}
//                 />
//               </Animated.View>
//             </TouchableOpacity>
//           )}
//         </View>

//         <Animated.View
//           style={{
//             opacity: animatedHeight,
//             transform: [
//               {
//                 scaleY: animatedHeight.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [0.96, 1],
//                 }),
//               },
//             ],
//           }}>
//           {open && children}
//         </Animated.View>
//       </View>
//     );
//   };

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
//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [shopResults, setShopResults] = useState<ProductResult[]>([]);

//   const [personalizedVisible, setPersonalizedVisible] = useState(false);
//   const [personalizedPurchases, setPersonalizedPurchases] = useState<any[]>([]);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const {recreateLook, loading: recreating} = useRecreateLook();
//   const [recreatedData, setRecreatedData] = useState<any | null>(null);
//   const [showRecreatedModal, setShowRecreatedModal] = useState(false);

//   const [shopVisible, setShopVisible] = useState(false);
//   const [recentVibes, setRecentVibes] = useState([]);
//   const [loadingVibes, setLoadingVibes] = useState(false);
//   const [recentCreations, setRecentCreations] = useState<any[]>([]);
//   const [loadingCreations, setLoadingCreations] = useState(false);

//   const {width, isXS, isSM, isMD} = useResponsive();

//   // Dynamically compute button width so layout adapts to device width
//   const buttonWidth =
//     isXS || isSM
//       ? (width - 64) / 2 // ➜ 2 columns on small phones like iPhone SE
//       : isMD
//       ? (width - 80) / 3 // ➜ 3 columns on mid-size phones
//       : 160; // ➜ fallback for large phones and tablets

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
//     const loadRecentVibes = async () => {
//       if (!userId) return;
//       setLoadingVibes(true);
//       try {
//         console.log('[RecentVibes] Fetching for user:', userId);
//         const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`);
//         const json = await res.json();
//         console.log('[RecentVibes] API Response:', json);

//         if (json?.data?.length) {
//           setRecentVibes(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentVibes(json);
//         } else {
//           console.warn('[RecentVibes] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentVibes] Load failed:', err);
//       } finally {
//         setLoadingVibes(false);
//       }
//     };
//     loadRecentVibes();
//   }, [userId]);

//   useEffect(() => {
//     const loadRecentCreations = async () => {
//       console.log;
//       if (!userId) return;
//       setLoadingCreations(true);
//       try {
//         console.log('[RecentCreations] Fetching for user:', userId);
//         const res = await fetch(
//           `${API_BASE_URL}/users/${userId}/recreated-looks`,
//         );
//         const json = await res.json();
//         console.log('[RecentCreations] API Response:', json);

//         if (json?.data?.length) {
//           setRecentCreations(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentCreations(json);
//         } else {
//           console.warn('[RecentCreations] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentCreations] Load failed:', err);
//       } finally {
//         setLoadingCreations(false);
//       }
//     };
//     loadRecentCreations();
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

//   const openPersonalizedShopModal = (data: PersonalizedResult) => {
//     if (!data) return;

//     const normalized: PersonalizedResult = {
//       recreated_outfit: Array.isArray(data.recreated_outfit)
//         ? [...data.recreated_outfit]
//         : [],
//       suggested_purchases: Array.isArray(data.suggested_purchases)
//         ? [...data.suggested_purchases]
//         : [],
//       style_note: data.style_note ?? '',
//       tags: data.tags ?? [],
//     };

//     console.log('💎 Opening Personalized Shop Modal with:', normalized);

//     setPersonalizedPurchases(JSON.parse(JSON.stringify(normalized)));

//     setTimeout(() => {
//       setPersonalizedVisible(true);
//     }, 100);
//   };

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
//       padding: moderateScale(tokens.spacing.sm),
//       borderRadius: tokens.borderRadius.md,
//     },
//     bannerText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginTop: moderateScale(tokens.spacing.quark),
//     },
//     bodyText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     subtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     dailyLookText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground3,
//       lineHeight: 22,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xsm),
//       marginTop: moderateScale(tokens.spacing.sm2),
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.buttonText1,
//     },
//     quickAccessItem: {
//       alignItems: 'center',
//       width: '40%',
//       minWidth: 140,
//       maxWidth: 185,
//       margin: moderateScale(tokens.spacing.sm),
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
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: moderateScale(tokens.spacing.nano),
//     },
//     weatherDesc: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.foreground2,
//     },
//     weatherTempContainer: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       paddingHorizontal: moderateScale(tokens.spacing.sm2),
//       borderRadius: tokens.borderRadius.md,
//       minWidth: moderateScale(72),
//       alignItems: 'center',
//     },
//     weatherTemp: {
//       fontSize: fontScale(tokens.fontSize['2.5xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.buttonText1,
//     },
//     weatherAdvice: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.bold,
//       color: '#ffd369',
//       marginTop: moderateScale(tokens.spacing.nano),
//       lineHeight: 22,
//       paddingRight: moderateScale(tokens.spacing.sm2),
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     tagText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.xsm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   // 🧥 Recreate Look
//   const handleRecreateLook = async ({image_url, tags}) => {
//     try {
//       console.log('[Home] Recreate from Saved Look:', image_url, tags);
//       const result = await recreateLook({user_id: userId, tags, image_url});
//       console.log('[Home] Recreated outfit result:', result);

//       // 💾 Save recreated look for recall
//       if (userId && result) {
//         try {
//           const payload = {
//             source_image_url: image_url,
//             generated_outfit: result,
//             tags,
//           };
//           console.log('💾 [RecreateSave] POST payload:', payload);

//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/recreated-looks`,
//             {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify(payload),
//             },
//           );

//           const json = await res.json();
//           console.log('💾 [RecreateSave] response:', json);
//         } catch (err) {
//           console.error('❌ [RecreateSave] failed:', err);
//         }
//       }

//       // 👇 Instead of navigation
//       setRecreatedData(result);
//       setShowRecreatedModal(true);
//     } catch (err) {
//       console.error('[Home] Failed to recreate:', err);
//     }
//   };

//   // 🛍️ Shop The Vibe
//   const handleShopModal = async (tags?: string[]) => {
//     try {
//       // ReactNativeHapticFeedback.trigger('impactMedium');
//       console.log('[Home] Shop tags:', tags);

//       const query = tags && tags.length > 0 ? tags.join(' ') : 'outfit';
//       const results = await searchProducts(query);
//       console.log('[Home] Shop results:', results);

//       if (results && results.length > 0) {
//         setShopResults(results); // ✅ saves results to modal state
//         setShopVisible(true); // ✅ opens modal
//       } else {
//         console.warn('[Home] No products found for', query);
//       }
//     } catch (err) {
//       console.error('[Home] Shop modal failed:', err);
//     }
//   };

//   const handleShareVibe = async vibe => {
//     try {
//       ReactNativeHapticFeedback.trigger('impactLight');

//       const imageUri = vibe.source_image_url || vibe.image_url;

//       if (!imageUri) {
//         console.warn('⚠️ No image URL found for vibe:', vibe);
//         Toast.show('This vibe has no image to share ❌', {
//           duration: Toast.durations.SHORT,
//           position: Toast.positions.BOTTOM,
//         });
//         return;
//       }

//       await Share.share({
//         url: imageUri,
//         message: `Just created this vibe ✨ with StylHelpr AI – ${
//           (vibe.tags && vibe.tags.slice(0, 3).join(', ')) ||
//           vibe.query_used ||
//           'New Look'
//         }`,
//         title: 'Share Your Vibe',
//       });

//       Toast.show('Vibe shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing vibe:', err);
//       Toast.show('Error sharing vibe ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

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
//             paddingHorizontal: moderateScale(tokens.spacing.md),
//             marginBottom: moderateScale(tokens.spacing.xxs),
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: fontScale(tokens.fontSize.base),
//               fontWeight: tokens.fontWeight.extraBold,
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
//             style={{
//               padding: moderateScale(tokens.spacing.xxs),
//               marginLeft: moderateScale(tokens.spacing.xsm),
//             }}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

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
//                 padding: moderateScale(tokens.spacing.sm),
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

//         {/* 🍎 Weather Section — Clean, Glanceable, Non-Redundant */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>

//             {weather && (
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     paddingVertical: moderateScale(tokens.spacing.md1),
//                     paddingHorizontal: moderateScale(tokens.spacing.md2),
//                   },
//                 ]}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   {/* 🌤️ Left column — City, Condition, Icon */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       flex: 1,
//                     }}>
//                     <Icon
//                       name={(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain') return 'umbrella';
//                         if (condition === 'Snow') return 'ac-unit';
//                         if (condition === 'Clouds') return 'wb-cloudy';
//                         if (condition === 'Clear') return 'wb-sunny';
//                         return 'wb-sunny';
//                       })()}
//                       size={36}
//                       color={theme.colors.foreground}
//                       style={{marginRight: moderateScale(tokens.spacing.xsm)}}
//                     />
//                     <View>
//                       <Text
//                         style={[
//                           styles.weatherCity,
//                           {
//                             fontSize: fontScale(tokens.fontSize.xl),
//                             fontWeight: tokens.fontWeight.bold,
//                           },
//                         ]}>
//                         {weather.celsius.name}
//                       </Text>
//                       <Text
//                         style={{
//                           fontSize: tokens.fontSize.base,
//                           color: theme.colors.foreground2,
//                           textTransform: 'capitalize',
//                         }}>
//                         {weather.celsius.weather[0].description}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* 🌡️ Right column — Big Temp */}
//                   <View style={styles.weatherTempContainer}>
//                     <Text
//                       style={{
//                         fontSize: moderateScale(
//                           isXS
//                             ? tokens.fontSize['2.5xl'] // ~28 pt → perfect for SE 3
//                             : isSM
//                             ? tokens.fontSize['3xl'] // ~30 pt → for 13 mini / 12 mini
//                             : isMD
//                             ? tokens.fontSize['3.5xl'] // ~32 pt → for standard 14 / 15
//                             : tokens.fontSize['4xl'], // ~36 pt → for Plus / Pro Max
//                         ),
//                         fontWeight: tokens.fontWeight.extraBold,
//                         color: theme.colors.buttonText1,
//                       }}>
//                       {Math.round(weather.fahrenheit.main.temp)}°F
//                     </Text>
//                   </View>
//                 </View>

//                 {/* 👇 Optional: short vibe line (kept minimal & non-overlapping) */}
//                 <View style={{marginTop: moderateScale(tokens.spacing.sm)}}>
//                   <Text
//                     style={{
//                       fontSize: fontScale(tokens.fontSize.md),
//                       color: theme.colors.foreground2,
//                       fontWeight: tokens.fontWeight.medium,
//                     }}>
//                     {(() => {
//                       const temp = weather.fahrenheit.main.temp;
//                       const condition = weather.celsius.weather[0].main;

//                       if (temp < 25) return '❄️ Brutally Cold';
//                       if (temp < 32)
//                         return condition === 'Snow'
//                           ? '🌨 Freezing & Snowy'
//                           : '🥶 Freezing';
//                       if (temp < 40)
//                         return condition === 'Clouds'
//                           ? '☁️ Bitter & Overcast'
//                           : '🧤 Bitter Cold';
//                       if (temp < 50)
//                         return condition === 'Rain'
//                           ? '🌧 Cold & Wet'
//                           : '🧥 Chilly';
//                       if (temp < 60)
//                         return condition === 'Clouds'
//                           ? '🌥 Cool & Cloudy'
//                           : '🌤 Crisp & Cool';
//                       if (temp < 70)
//                         return condition === 'Clear'
//                           ? '☀️ Mild & Bright'
//                           : '🌤 Mild';
//                       if (temp < 80)
//                         return condition === 'Clear'
//                           ? '☀️ Warm & Clear'
//                           : '🌦 Warm';
//                       if (temp < 90)
//                         return condition === 'Rain'
//                           ? '🌦 Hot & Humid'
//                           : '🔥 Hot';
//                       if (temp < 100) return '🥵 Very Hot';
//                       return '🌋 Extreme Heat';
//                     })()}
//                   </Text>
//                 </View>
//               </View>
//             )}
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
//               <Text
//                 style={[
//                   globalStyles.sectionTitle,
//                   {paddingTop: moderateScale(tokens.spacing.nano)},
//                 ]}>
//                 Your Location
//               </Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: moderateScale(tokens.spacing.xsm),
//                   // paddingTop: moderateScale(tokens.spacing.xxs),
//                   borderRadius: 20,
//                 }}>
//                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={30}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 // marginTop: moderateScale(tokens.spacing.xs),
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
//                       padding: moderateScale(tokens.spacing.md2),
//                       justifyContent: 'space-between',
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
//                       style={{
//                         width: '48%',
//                         marginBottom: idx < 2 ? 20 : 0, // ✅ only apply margin to the first row
//                       }}>
//                       <AppleTouchFeedback
//                         style={[
//                           globalStyles.buttonPrimary,
//                           {
//                             width: '100%',
//                             justifyContent: 'center',
//                           },
//                         ]}
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

//         <Text
//           style={[
//             globalStyles.sectionTitle,
//             {
//               marginLeft: moderateScale(tokens.spacing.md2),
//               marginBottom: moderateScale(tokens.spacing.md),
//             },
//           ]}>
//           Your Inspired Looks
//         </Text>

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <CollapsibleSection title="Saved Looks">
//             <Animatable.View
//               animation="fadeInUp"
//               delay={800}
//               duration={700}
//               useNativeDriver
//               style={[
//                 globalStyles.sectionScroll,
//                 {marginBottom: moderateScale(tokens.spacing.sm)},
//               ]}>
//               {/* <View style={{flexDirection: 'row'}}>
//                 <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//               </View> */}

//               {savedLooks.length === 0 ? (
//                 <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                   <Text style={globalStyles.missingDataMessage1}>
//                     No saved looks.
//                   </Text>
//                   <TooltipBubble
//                     message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                     position="top"
//                   />
//                 </View>
//               ) : (
//                 <ScrollView
//                   horizontal
//                   showsHorizontalScrollIndicator={false}
//                   contentContainerStyle={{
//                     paddingRight: moderateScale(tokens.spacing.xs),
//                   }}>
//                   {savedLooks.map((look, index) => (
//                     <Animatable.View
//                       key={look.id}
//                       animation="fadeInUp"
//                       delay={900 + index * 100}
//                       useNativeDriver
//                       style={globalStyles.outfitCard}>
//                       <AppleTouchFeedback
//                         hapticStyle="impactLight"
//                         onPress={() => {
//                           setSelectedLook(look);
//                           setPreviewVisible(true);
//                         }}
//                         style={{alignItems: 'center'}}>
//                         <View>
//                           <Image
//                             source={{uri: look.image_url}}
//                             style={[
//                               globalStyles.image4,
//                               {
//                                 borderColor: theme.colors.surfaceBorder,
//                                 borderWidth: tokens.borderWidth.md,
//                                 borderRadius: tokens.borderRadius.md,
//                               },
//                             ]}
//                             resizeMode="cover"
//                           />
//                         </View>
//                         <Text style={[globalStyles.subLabel]} numberOfLines={1}>
//                           {look.name}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </ScrollView>
//               )}
//               {savedLooks.length > 0 && (
//                 <TouchableOpacity
//                   onPress={() => setImageModalVisible(true)}
//                   style={{
//                     alignSelf: 'flex-end',
//                     marginTop: moderateScale(tokens.spacing.xs),
//                     marginRight: moderateScale(tokens.spacing.sm),
//                   }}>
//                   <Text
//                     style={{
//                       fontSize: fontScale(tokens.fontSize.sm),
//                       color: theme.colors.foreground,
//                       fontWeight: tokens.fontWeight.bold,
//                     }}>
//                     See All Saved Looks
//                   </Text>
//                 </TouchableOpacity>
//               )}
//             </Animatable.View>
//             {prefs.savedLooks && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 delay={1000}
//                 duration={700}
//                 useNativeDriver
//                 style={{
//                   alignItems: 'center',
//                   marginBottom: moderateScale(tokens.spacing.md2),
//                 }}>
//                 <AppleTouchFeedback
//                   style={[
//                     globalStyles.buttonPrimary4,
//                     {width: 90, marginTop: -12},
//                   ]}
//                   hapticStyle="impactHeavy"
//                   onPress={() => setSaveModalVisible(true)}>
//                   <Text style={globalStyles.buttonPrimaryText4}>Add Look</Text>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             )}
//           </CollapsibleSection>
//         )}

//         {/* RECENT CREATED VIBES SECTION*/}
//         {loadingCreations && (
//           <Animatable.View
//             animation="fadeIn"
//             duration={400}
//             useNativeDriver
//             style={{
//               padding: moderateScale(tokens.spacing.md),
//               alignItems: 'center',
//             }}>
//             <Text style={{color: theme.colors.foreground2}}>
//               Loading recent creations...
//             </Text>
//           </Animatable.View>
//         )}

//         {!loadingCreations && recentCreations.length > 0 && (
//           <CollapsibleSection title="Recently Created Vibe">
//             <Animatable.View
//               animation="fadeInUp"
//               delay={150}
//               duration={600}
//               useNativeDriver
//               style={globalStyles.section}>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {recentCreations.map(c => (
//                   <TouchableOpacity
//                     key={c.id}
//                     onPress={() =>
//                       navigate('RecreatedLook', {data: c.generated_outfit})
//                     }
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactLight');
//                         navigate('RecreatedLook', {data: c.generated_outfit});
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <Image
//                         source={{uri: c.source_image_url}}
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
//                     </AppleTouchFeedback>
//                     {/* 👇 ADD THIS just below the image */}
//                     <TouchableOpacity
//                       onPress={() => handleShareVibe(c)}
//                       style={{
//                         position: 'absolute',
//                         top: 6,
//                         right: 6,
//                         backgroundColor: 'rgba(0,0,0,0.4)',
//                         borderRadius: 20,
//                         padding: moderateScale(tokens.spacing.xxs),
//                       }}>
//                       <Icon
//                         name="ios-share"
//                         size={20}
//                         color={theme.colors.buttonText1}
//                       />
//                     </TouchableOpacity>

//                     <Text
//                       numberOfLines={1}
//                       style={[
//                         globalStyles.subLabel,
//                         {
//                           marginTop: moderateScale(tokens.spacing.xxs),
//                           textAlign: 'center',
//                         },
//                       ]}>
//                       {(c.tags && c.tags.slice(0, 3).join(' ')) || 'AI Look'}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             </Animatable.View>
//           </CollapsibleSection>
//         )}

//         {/* RECENT SHOP VIBES SECTION */}
//         {loadingVibes && (
//           <Animatable.View
//             animation="fadeIn"
//             duration={400}
//             useNativeDriver
//             style={{
//               padding: moderateScale(tokens.spacing.md),
//               alignItems: 'center',
//             }}>
//             <Text style={{color: theme.colors.foreground2}}>
//               Loading recent vibes...
//             </Text>
//           </Animatable.View>
//         )}

//         {!loadingVibes && recentVibes.length > 0 && (
//           <CollapsibleSection title="Recently Shopped Vibe">
//             <Animatable.View
//               animation="fadeInUp"
//               delay={150}
//               duration={600}
//               useNativeDriver
//               style={globalStyles.section}>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {recentVibes.map((vibe, index) => (
//                   <Animatable.View
//                     key={vibe.id || index}
//                     animation="fadeIn"
//                     delay={200 + index * 80}
//                     duration={400}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <TouchableOpacity
//                       activeOpacity={0.85}
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactMedium');
//                         handleShopModal([vibe.query_used]);
//                       }}>
//                       <AppleTouchFeedback
//                         hapticStyle="impactMedium"
//                         onPress={() => {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           handleShopModal([vibe.query_used]);
//                         }}
//                         style={{alignItems: 'center'}}>
//                         <Image
//                           source={{uri: vibe.image_url}}
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
//                         {/* 👇 Add share button */}
//                         <TouchableOpacity
//                           onPress={() => handleShareVibe(vibe)}
//                           style={{
//                             position: 'absolute',
//                             top: 6,
//                             right: 6,
//                             backgroundColor: 'rgba(0,0,0,0.4)',
//                             borderRadius: 20,
//                             padding: moderateScale(tokens.spacing.xxs),
//                           }}>
//                           <Icon name="ios-share" size={20} color="#fff" />
//                         </TouchableOpacity>
//                       </AppleTouchFeedback>

//                       <Text
//                         numberOfLines={1}
//                         style={[
//                           globalStyles.subLabel,
//                           {
//                             marginTop: moderateScale(tokens.spacing.xxs),
//                             textAlign: 'center',
//                           },
//                         ]}>
//                         {vibe.query_used?.split(' ').slice(0, 3).join(' ') ||
//                           'Recent'}
//                       </Text>
//                     </TouchableOpacity>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             </Animatable.View>
//           </CollapsibleSection>
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
//         <AllSavedLooksModal
//           visible={imageModalVisible}
//           onClose={() => setImageModalVisible(false)}
//           savedLooks={savedLooks}
//           recreateLook={handleRecreateLook}
//           openShopModal={handleShopModal}
//           shopResults={shopResults}
//           openPersonalizedShopModal={openPersonalizedShopModal} // ✅ add this
//         />
//         <ShopModal
//           visible={shopVisible}
//           onClose={() => setShopVisible(false)}
//           results={shopResults}
//         />
//         {/* <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={personalizedPurchases}
//         /> */}
//         <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={
//             personalizedPurchases?.purchases ??
//             personalizedPurchases?.suggested_purchases ??
//             []
//           }
//           recreatedOutfit={
//             personalizedPurchases?.recreatedOutfit ??
//             personalizedPurchases?.recreated_outfit ??
//             []
//           }
//           styleNote={
//             personalizedPurchases?.styleNote ??
//             personalizedPurchases?.style_note ??
//             ''
//           }
//         />

//         {showRecreatedModal && recreatedData && (
//           <Modal
//             visible={showRecreatedModal}
//             animationType="slide"
//             transparent={false}
//             presentationStyle="fullScreen"
//             statusBarTranslucent
//             onRequestClose={() => setShowRecreatedModal(false)}>
//             <RecreatedLookScreen
//               route={{params: {data: recreatedData}}}
//               navigation={{goBack: () => setShowRecreatedModal(false)}}
//             />
//           </Modal>
//         )}
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
//   Modal,
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
// import {fontScale, moderateScale} from '../utils/scale';
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
// import AllSavedLooksModal from '../components/AllSavedLooksModal/AllSavedLooksModal';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {searchProducts} from '../services/productSearchClient';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {Linking} from 'react-native';
// import type {ProductResult} from '../services/productSearchClient';
// import ShopModal from '../components/ShopModal/ShopModal';
// import {Share} from 'react-native';
// import ViewShot from 'react-native-view-shot';
// import PersonalizedShopModal from '../components/PersonalizedShopModal/PersonalizedShopModal';
// import RecreatedLookScreen from './RecreatedLookScreen';
// import {Camera} from 'react-native-vision-camera';
// import {useResponsive} from '../hooks/useResponsive';

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

//   useEffect(() => {
//     (async () => {
//       const status = await Camera.getCameraPermissionStatus();
//       console.log('🔒 Camera permission status:', status);
//       if (status !== 'authorized') {
//         const newStatus = await Camera.requestCameraPermission();
//         console.log('🔓 New camera permission:', newStatus);
//       }
//     })();
//   }, []);

//   // Simple inline collapsible wrapper — smooth open/close animation
//   const CollapsibleSection: React.FC<{
//     title?: string;
//     children: React.ReactNode;
//     defaultOpen?: boolean;
//   }> = ({title, children, defaultOpen = true}) => {
//     const [open, setOpen] = useState(defaultOpen);
//     const animatedHeight = useRef(
//       new Animated.Value(defaultOpen ? 1 : 0),
//     ).current;

//     const toggle = () => {
//       Animated.timing(animatedHeight, {
//         toValue: open ? 0 : 1,
//         duration: 260,
//         easing: Easing.out(Easing.quad),
//         useNativeDriver: false,
//       }).start(() => setOpen(!open));
//     };

//     const height = animatedHeight.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, 1],
//     });

//     return (
//       <View
//         style={[
//           {
//             overflow: 'hidden',
//             backgroundColor: theme.colors.background,
//             marginBottom: open ? 4 : 20, // ✅ only when collapsed
//           },
//         ]}>
//         <View style={{marginBottom: moderateScale(tokens.spacing.quark)}}>
//           {title && (
//             <TouchableOpacity
//               activeOpacity={0.7}
//               onPress={toggle}
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'flex-start',
//               }}>
//               <Text
//                 style={[
//                   // globalStyles.sectionTitle,
//                   {
//                     color: theme.colors.foreground,
//                     fontSize: fontScale(tokens.fontSize.lg),
//                     fontWeight: '600',
//                     paddingHorizontal: moderateScale(tokens.spacing.md2),
//                     textTransform: 'none',
//                   },
//                 ]}>
//                 {title}
//               </Text>

//               <Animated.View
//                 style={{
//                   transform: [
//                     {
//                       rotateZ: animatedHeight.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: ['0deg', '180deg'],
//                       }),
//                     },
//                   ],
//                 }}>
//                 <Icon
//                   name="keyboard-arrow-down"
//                   size={28}
//                   color={theme.colors.foreground}
//                   style={{paddingHorizontal: moderateScale(tokens.spacing.md2)}}
//                 />
//               </Animated.View>
//             </TouchableOpacity>
//           )}
//         </View>

//         <Animated.View
//           style={{
//             opacity: animatedHeight,
//             transform: [
//               {
//                 scaleY: animatedHeight.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [0.96, 1],
//                 }),
//               },
//             ],
//           }}>
//           {open && children}
//         </Animated.View>
//       </View>
//     );
//   };

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
//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [shopResults, setShopResults] = useState<ProductResult[]>([]);

//   const [personalizedVisible, setPersonalizedVisible] = useState(false);
//   const [personalizedPurchases, setPersonalizedPurchases] = useState<any[]>([]);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const {recreateLook, loading: recreating} = useRecreateLook();
//   const [recreatedData, setRecreatedData] = useState<any | null>(null);
//   const [showRecreatedModal, setShowRecreatedModal] = useState(false);

//   const [shopVisible, setShopVisible] = useState(false);
//   const [recentVibes, setRecentVibes] = useState([]);
//   const [loadingVibes, setLoadingVibes] = useState(false);
//   const [recentCreations, setRecentCreations] = useState<any[]>([]);
//   const [loadingCreations, setLoadingCreations] = useState(false);

//   const {width, isXS, isSM, isMD} = useResponsive();

//   // Dynamically compute button width so layout adapts to device width
//   const buttonWidth =
//     isXS || isSM
//       ? (width - 64) / 2 // ➜ 2 columns on small phones like iPhone SE
//       : isMD
//       ? (width - 80) / 3 // ➜ 3 columns on mid-size phones
//       : 160; // ➜ fallback for large phones and tablets

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
//     const loadRecentVibes = async () => {
//       if (!userId) return;
//       setLoadingVibes(true);
//       try {
//         console.log('[RecentVibes] Fetching for user:', userId);
//         const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`);
//         const json = await res.json();
//         console.log('[RecentVibes] API Response:', json);

//         if (json?.data?.length) {
//           setRecentVibes(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentVibes(json);
//         } else {
//           console.warn('[RecentVibes] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentVibes] Load failed:', err);
//       } finally {
//         setLoadingVibes(false);
//       }
//     };
//     loadRecentVibes();
//   }, [userId]);

//   useEffect(() => {
//     const loadRecentCreations = async () => {
//       console.log;
//       if (!userId) return;
//       setLoadingCreations(true);
//       try {
//         console.log('[RecentCreations] Fetching for user:', userId);
//         const res = await fetch(
//           `${API_BASE_URL}/users/${userId}/recreated-looks`,
//         );
//         const json = await res.json();
//         console.log('[RecentCreations] API Response:', json);

//         if (json?.data?.length) {
//           setRecentCreations(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentCreations(json);
//         } else {
//           console.warn('[RecentCreations] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentCreations] Load failed:', err);
//       } finally {
//         setLoadingCreations(false);
//       }
//     };
//     loadRecentCreations();
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

//   const openPersonalizedShopModal = (data: PersonalizedResult) => {
//     if (!data) return;

//     const normalized: PersonalizedResult = {
//       recreated_outfit: Array.isArray(data.recreated_outfit)
//         ? [...data.recreated_outfit]
//         : [],
//       suggested_purchases: Array.isArray(data.suggested_purchases)
//         ? [...data.suggested_purchases]
//         : [],
//       style_note: data.style_note ?? '',
//       tags: data.tags ?? [],
//     };

//     console.log('💎 Opening Personalized Shop Modal with:', normalized);

//     setPersonalizedPurchases(JSON.parse(JSON.stringify(normalized)));

//     setTimeout(() => {
//       setPersonalizedVisible(true);
//     }, 100);
//   };

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
//       padding: moderateScale(tokens.spacing.sm),
//       borderRadius: tokens.borderRadius.md,
//     },
//     bannerText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     bannerSubtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginTop: moderateScale(tokens.spacing.quark),
//     },
//     bodyText: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     subtext: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground,
//     },
//     dailyLookText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.normal,
//       color: theme.colors.foreground3,
//       lineHeight: 22,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xsm),
//       marginTop: moderateScale(tokens.spacing.sm2),
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.buttonText1,
//     },
//     quickAccessItem: {
//       alignItems: 'center',
//       width: '40%',
//       minWidth: 140,
//       maxWidth: 185,
//       margin: moderateScale(tokens.spacing.sm),
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
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: moderateScale(tokens.spacing.nano),
//     },
//     weatherDesc: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.foreground2,
//     },
//     weatherTempContainer: {
//       backgroundColor: theme.colors.button1,
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       paddingHorizontal: moderateScale(tokens.spacing.sm2),
//       borderRadius: tokens.borderRadius.md,
//       minWidth: moderateScale(72),
//       alignItems: 'center',
//     },
//     weatherTemp: {
//       fontSize: fontScale(tokens.fontSize['2.5xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.buttonText1,
//     },
//     weatherAdvice: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.bold,
//       color: '#ffd369',
//       marginTop: moderateScale(tokens.spacing.nano),
//       lineHeight: 22,
//       paddingRight: moderateScale(tokens.spacing.sm2),
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 20,
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     tagText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     tooltip: {
//       position: 'absolute',
//       top: -38,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.xsm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     tooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//     quickTooltip: {
//       position: 'absolute',
//       bottom: 60,
//       backgroundColor: 'rgba(28,28,30,0.95)',
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//       borderRadius: 8,
//       maxWidth: 180,
//       zIndex: 999,
//     },
//     quickTooltipText: {
//       color: theme.colors.buttonText1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       textAlign: 'center',
//     },
//   });

//   if (!ready) {
//     return <View style={globalStyles.screen} />;
//   }

//   // 🧥 Recreate Look
//   const handleRecreateLook = async ({image_url, tags}) => {
//     try {
//       console.log('[Home] Recreate from Saved Look:', image_url, tags);
//       const result = await recreateLook({user_id: userId, tags, image_url});
//       console.log('[Home] Recreated outfit result:', result);

//       // 💾 Save recreated look for recall
//       if (userId && result) {
//         try {
//           const payload = {
//             source_image_url: image_url,
//             generated_outfit: result,
//             tags,
//           };
//           console.log('💾 [RecreateSave] POST payload:', payload);

//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/recreated-looks`,
//             {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify(payload),
//             },
//           );

//           const json = await res.json();
//           console.log('💾 [RecreateSave] response:', json);
//         } catch (err) {
//           console.error('❌ [RecreateSave] failed:', err);
//         }
//       }

//       // 👇 Instead of navigation
//       setRecreatedData(result);
//       setShowRecreatedModal(true);
//     } catch (err) {
//       console.error('[Home] Failed to recreate:', err);
//     }
//   };

//   // 🛍️ Shop The Vibe
//   const handleShopModal = async (tags?: string[]) => {
//     try {
//       // ReactNativeHapticFeedback.trigger('impactMedium');
//       console.log('[Home] Shop tags:', tags);

//       const query = tags && tags.length > 0 ? tags.join(' ') : 'outfit';
//       const results = await searchProducts(query);
//       console.log('[Home] Shop results:', results);

//       if (results && results.length > 0) {
//         setShopResults(results); // ✅ saves results to modal state
//         setShopVisible(true); // ✅ opens modal
//       } else {
//         console.warn('[Home] No products found for', query);
//       }
//     } catch (err) {
//       console.error('[Home] Shop modal failed:', err);
//     }
//   };

//   const handleShareVibe = async vibe => {
//     try {
//       ReactNativeHapticFeedback.trigger('impactLight');

//       const imageUri = vibe.source_image_url || vibe.image_url;

//       if (!imageUri) {
//         console.warn('⚠️ No image URL found for vibe:', vibe);
//         Toast.show('This vibe has no image to share ❌', {
//           duration: Toast.durations.SHORT,
//           position: Toast.positions.BOTTOM,
//         });
//         return;
//       }

//       await Share.share({
//         url: imageUri,
//         message: `Just created this vibe ✨ with StylHelpr AI – ${
//           (vibe.tags && vibe.tags.slice(0, 3).join(', ')) ||
//           vibe.query_used ||
//           'New Look'
//         }`,
//         title: 'Share Your Vibe',
//       });

//       Toast.show('Vibe shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing vibe:', err);
//       Toast.show('Error sharing vibe ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

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
//             paddingHorizontal: moderateScale(tokens.spacing.md),
//             marginBottom: moderateScale(tokens.spacing.xxs),
//           }}>
//           <Text
//             style={{
//               flex: 1,
//               fontSize: fontScale(tokens.fontSize.base),
//               fontWeight: tokens.fontWeight.extraBold,
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
//             style={{
//               padding: moderateScale(tokens.spacing.xxs),
//               marginLeft: moderateScale(tokens.spacing.xsm),
//             }}>
//             <Icon name="tune" size={22} color={theme.colors.button1} />
//           </AppleTouchFeedback>
//         </Animatable.View>

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
//                 padding: moderateScale(tokens.spacing.sm),
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

//         {/* 🍎 Weather Section — Clean, Glanceable, Non-Redundant */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>

//             {weather && (
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {
//                     paddingVertical: moderateScale(tokens.spacing.md1),
//                     paddingHorizontal: moderateScale(tokens.spacing.md2),
//                   },
//                 ]}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   {/* 🌤️ Left column — City, Condition, Icon */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       flex: 1,
//                     }}>
//                     <Icon
//                       name={(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain') return 'umbrella';
//                         if (condition === 'Snow') return 'ac-unit';
//                         if (condition === 'Clouds') return 'wb-cloudy';
//                         if (condition === 'Clear') return 'wb-sunny';
//                         return 'wb-sunny';
//                       })()}
//                       size={36}
//                       color={theme.colors.foreground}
//                       style={{marginRight: moderateScale(tokens.spacing.xsm)}}
//                     />
//                     <View>
//                       <Text
//                         style={[
//                           styles.weatherCity,
//                           {
//                             fontSize: fontScale(tokens.fontSize.xl),
//                             fontWeight: tokens.fontWeight.bold,
//                           },
//                         ]}>
//                         {weather.celsius.name}
//                       </Text>
//                       <Text
//                         style={{
//                           fontSize: tokens.fontSize.base,
//                           color: theme.colors.foreground2,
//                           textTransform: 'capitalize',
//                         }}>
//                         {weather.celsius.weather[0].description}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* 🌡️ Right column — Big Temp */}
//                   <View style={styles.weatherTempContainer}>
//                     <Text
//                       style={{
//                         fontSize: moderateScale(
//                           isXS
//                             ? tokens.fontSize['2.5xl'] // ~28 pt → perfect for SE 3
//                             : isSM
//                             ? tokens.fontSize['3xl'] // ~30 pt → for 13 mini / 12 mini
//                             : isMD
//                             ? tokens.fontSize['3.5xl'] // ~32 pt → for standard 14 / 15
//                             : tokens.fontSize['4xl'], // ~36 pt → for Plus / Pro Max
//                         ),
//                         fontWeight: tokens.fontWeight.extraBold,
//                         color: theme.colors.buttonText1,
//                       }}>
//                       {Math.round(weather.fahrenheit.main.temp)}°F
//                     </Text>
//                   </View>
//                 </View>

//                 {/* 👇 Optional: short vibe line (kept minimal & non-overlapping) */}
//                 <View style={{marginTop: moderateScale(tokens.spacing.sm)}}>
//                   <Text
//                     style={{
//                       fontSize: fontScale(tokens.fontSize.md),
//                       color: theme.colors.foreground2,
//                       fontWeight: tokens.fontWeight.medium,
//                     }}>
//                     {(() => {
//                       const temp = weather.fahrenheit.main.temp;
//                       const condition = weather.celsius.weather[0].main;

//                       if (temp < 25) return '❄️ Brutally Cold';
//                       if (temp < 32)
//                         return condition === 'Snow'
//                           ? '🌨 Freezing & Snowy'
//                           : '🥶 Freezing';
//                       if (temp < 40)
//                         return condition === 'Clouds'
//                           ? '☁️ Bitter & Overcast'
//                           : '🧤 Bitter Cold';
//                       if (temp < 50)
//                         return condition === 'Rain'
//                           ? '🌧 Cold & Wet'
//                           : '🧥 Chilly';
//                       if (temp < 60)
//                         return condition === 'Clouds'
//                           ? '🌥 Cool & Cloudy'
//                           : '🌤 Crisp & Cool';
//                       if (temp < 70)
//                         return condition === 'Clear'
//                           ? '☀️ Mild & Bright'
//                           : '🌤 Mild';
//                       if (temp < 80)
//                         return condition === 'Clear'
//                           ? '☀️ Warm & Clear'
//                           : '🌦 Warm';
//                       if (temp < 90)
//                         return condition === 'Rain'
//                           ? '🌦 Hot & Humid'
//                           : '🔥 Hot';
//                       if (temp < 100) return '🥵 Very Hot';
//                       return '🌋 Extreme Heat';
//                     })()}
//                   </Text>
//                 </View>
//               </View>
//             )}
//           </Animatable.View>
//         )}

//         <Text style={[globalStyles.sectionTitle, {paddingHorizontal: 22}]}>
//           AI Style Suggestions
//         </Text>
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
//               <Text
//                 style={[
//                   globalStyles.sectionTitle,
//                   {paddingTop: moderateScale(tokens.spacing.nano)},
//                 ]}>
//                 Your Location
//               </Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={toggleMap}
//                 style={{
//                   paddingHorizontal: moderateScale(tokens.spacing.xsm),
//                   // paddingTop: moderateScale(tokens.spacing.xxs),
//                   borderRadius: 20,
//                 }}>
//                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={30}
//                       color={theme.colors.foreground}
//                     />
//                   </Animated.View>
//                 </View>
//               </AppleTouchFeedback>
//             </View>

//             <Animated.View
//               style={{
//                 // marginTop: moderateScale(tokens.spacing.xs),
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
//                       padding: moderateScale(tokens.spacing.md2),
//                       justifyContent: 'space-between',
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
//                       style={{
//                         width: '48%',
//                         marginBottom: idx < 2 ? 20 : 0, // ✅ only apply margin to the first row
//                       }}>
//                       <AppleTouchFeedback
//                         style={[
//                           globalStyles.buttonPrimary,
//                           {
//                             width: '100%',
//                             justifyContent: 'center',
//                           },
//                         ]}
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

//         <Text
//           style={[
//             globalStyles.sectionTitle,
//             {
//               marginLeft: moderateScale(tokens.spacing.md2),
//               marginBottom: moderateScale(tokens.spacing.md),
//             },
//           ]}>
//           Your Inspired Looks
//         </Text>

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <CollapsibleSection title="Saved Looks">
//             <Animatable.View
//               animation="fadeInUp"
//               delay={800}
//               duration={700}
//               useNativeDriver
//               style={[
//                 globalStyles.sectionScroll,
//                 {marginBottom: moderateScale(tokens.spacing.sm)},
//               ]}>
//               {/* <View style={{flexDirection: 'row'}}>
//                 <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//               </View> */}

//               {savedLooks.length === 0 ? (
//                 <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                   <Text style={globalStyles.missingDataMessage1}>
//                     No saved looks.
//                   </Text>
//                   <TooltipBubble
//                     message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                     position="top"
//                   />
//                 </View>
//               ) : (
//                 <ScrollView
//                   horizontal
//                   showsHorizontalScrollIndicator={false}
//                   contentContainerStyle={{
//                     paddingRight: moderateScale(tokens.spacing.xs),
//                   }}>
//                   {savedLooks.map((look, index) => (
//                     <Animatable.View
//                       key={look.id}
//                       animation="fadeInUp"
//                       delay={900 + index * 100}
//                       useNativeDriver
//                       style={globalStyles.outfitCard}>
//                       <AppleTouchFeedback
//                         hapticStyle="impactLight"
//                         onPress={() => {
//                           setSelectedLook(look);
//                           setPreviewVisible(true);
//                         }}
//                         style={{alignItems: 'center'}}>
//                         <View>
//                           <Image
//                             source={{uri: look.image_url}}
//                             style={[
//                               globalStyles.image4,
//                               {
//                                 borderColor: theme.colors.surfaceBorder,
//                                 borderWidth: tokens.borderWidth.md,
//                                 borderRadius: tokens.borderRadius.md,
//                               },
//                             ]}
//                             resizeMode="cover"
//                           />
//                         </View>
//                         <Text style={[globalStyles.subLabel]} numberOfLines={1}>
//                           {look.name}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </ScrollView>
//               )}
//               {savedLooks.length > 0 && (
//                 <TouchableOpacity
//                   onPress={() => setImageModalVisible(true)}
//                   style={{
//                     alignSelf: 'flex-end',
//                     marginTop: moderateScale(tokens.spacing.xs),
//                     marginRight: moderateScale(tokens.spacing.sm),
//                   }}>
//                   <Text
//                     style={{
//                       fontSize: fontScale(tokens.fontSize.sm),
//                       color: theme.colors.foreground,
//                       fontWeight: tokens.fontWeight.bold,
//                     }}>
//                     See All Saved Looks
//                   </Text>
//                 </TouchableOpacity>
//               )}
//             </Animatable.View>
//             {prefs.savedLooks && (
//               <Animatable.View
//                 animation="fadeInUp"
//                 delay={1000}
//                 duration={700}
//                 useNativeDriver
//                 style={{
//                   alignItems: 'center',
//                   marginBottom: moderateScale(tokens.spacing.md2),
//                 }}>
//                 <AppleTouchFeedback
//                   style={[
//                     globalStyles.buttonPrimary4,
//                     {width: 90, marginTop: -12},
//                   ]}
//                   hapticStyle="impactHeavy"
//                   onPress={() => setSaveModalVisible(true)}>
//                   <Text style={globalStyles.buttonPrimaryText4}>Add Look</Text>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             )}
//           </CollapsibleSection>
//         )}

//         {/* RECENT CREATED VIBES SECTION*/}
//         {loadingCreations && (
//           <Animatable.View
//             animation="fadeIn"
//             duration={400}
//             useNativeDriver
//             style={{
//               padding: moderateScale(tokens.spacing.md),
//               alignItems: 'center',
//             }}>
//             <Text style={{color: theme.colors.foreground2}}>
//               Loading recent creations...
//             </Text>
//           </Animatable.View>
//         )}

//         {!loadingCreations && recentCreations.length > 0 && (
//           <CollapsibleSection title="Recently Created Vibe">
//             <Animatable.View
//               animation="fadeInUp"
//               delay={150}
//               duration={600}
//               useNativeDriver
//               style={globalStyles.section}>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {recentCreations.map(c => (
//                   <TouchableOpacity
//                     key={c.id}
//                     onPress={() =>
//                       navigate('RecreatedLook', {data: c.generated_outfit})
//                     }
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactLight');
//                         navigate('RecreatedLook', {data: c.generated_outfit});
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <Image
//                         source={{uri: c.source_image_url}}
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
//                     </AppleTouchFeedback>
//                     {/* 👇 ADD THIS just below the image */}
//                     <TouchableOpacity
//                       onPress={() => handleShareVibe(c)}
//                       style={{
//                         position: 'absolute',
//                         top: 6,
//                         right: 6,
//                         backgroundColor: 'rgba(0,0,0,0.4)',
//                         borderRadius: 20,
//                         padding: moderateScale(tokens.spacing.xxs),
//                       }}>
//                       <Icon
//                         name="ios-share"
//                         size={20}
//                         color={theme.colors.buttonText1}
//                       />
//                     </TouchableOpacity>

//                     <Text
//                       numberOfLines={1}
//                       style={[
//                         globalStyles.subLabel,
//                         {
//                           marginTop: moderateScale(tokens.spacing.xxs),
//                           textAlign: 'center',
//                         },
//                       ]}>
//                       {(c.tags && c.tags.slice(0, 3).join(' ')) || 'AI Look'}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             </Animatable.View>
//           </CollapsibleSection>
//         )}

//         {/* RECENT SHOP VIBES SECTION */}
//         {loadingVibes && (
//           <Animatable.View
//             animation="fadeIn"
//             duration={400}
//             useNativeDriver
//             style={{
//               padding: moderateScale(tokens.spacing.md),
//               alignItems: 'center',
//             }}>
//             <Text style={{color: theme.colors.foreground2}}>
//               Loading recent vibes...
//             </Text>
//           </Animatable.View>
//         )}

//         {!loadingVibes && recentVibes.length > 0 && (
//           <CollapsibleSection title="Recently Shopped Vibe">
//             <Animatable.View
//               animation="fadeInUp"
//               delay={150}
//               duration={600}
//               useNativeDriver
//               style={globalStyles.section}>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {recentVibes.map((vibe, index) => (
//                   <Animatable.View
//                     key={vibe.id || index}
//                     animation="fadeIn"
//                     delay={200 + index * 80}
//                     duration={400}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <TouchableOpacity
//                       activeOpacity={0.85}
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactMedium');
//                         handleShopModal([vibe.query_used]);
//                       }}>
//                       <AppleTouchFeedback
//                         hapticStyle="impactMedium"
//                         onPress={() => {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           handleShopModal([vibe.query_used]);
//                         }}
//                         style={{alignItems: 'center'}}>
//                         <Image
//                           source={{uri: vibe.image_url}}
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
//                         {/* 👇 Add share button */}
//                         <TouchableOpacity
//                           onPress={() => handleShareVibe(vibe)}
//                           style={{
//                             position: 'absolute',
//                             top: 6,
//                             right: 6,
//                             backgroundColor: 'rgba(0,0,0,0.4)',
//                             borderRadius: 20,
//                             padding: moderateScale(tokens.spacing.xxs),
//                           }}>
//                           <Icon name="ios-share" size={20} color="#fff" />
//                         </TouchableOpacity>
//                       </AppleTouchFeedback>

//                       <Text
//                         numberOfLines={1}
//                         style={[
//                           globalStyles.subLabel,
//                           {
//                             marginTop: moderateScale(tokens.spacing.xxs),
//                             textAlign: 'center',
//                           },
//                         ]}>
//                         {vibe.query_used?.split(' ').slice(0, 3).join(' ') ||
//                           'Recent'}
//                       </Text>
//                     </TouchableOpacity>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             </Animatable.View>
//           </CollapsibleSection>
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
//         <AllSavedLooksModal
//           visible={imageModalVisible}
//           onClose={() => setImageModalVisible(false)}
//           savedLooks={savedLooks}
//           recreateLook={handleRecreateLook}
//           openShopModal={handleShopModal}
//           shopResults={shopResults}
//           openPersonalizedShopModal={openPersonalizedShopModal} // ✅ add this
//         />
//         <ShopModal
//           visible={shopVisible}
//           onClose={() => setShopVisible(false)}
//           results={shopResults}
//         />
//         {/* <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={personalizedPurchases}
//         /> */}
//         <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={
//             personalizedPurchases?.purchases ??
//             personalizedPurchases?.suggested_purchases ??
//             []
//           }
//           recreatedOutfit={
//             personalizedPurchases?.recreatedOutfit ??
//             personalizedPurchases?.recreated_outfit ??
//             []
//           }
//           styleNote={
//             personalizedPurchases?.styleNote ??
//             personalizedPurchases?.style_note ??
//             ''
//           }
//         />

//         {showRecreatedModal && recreatedData && (
//           <Modal
//             visible={showRecreatedModal}
//             animationType="slide"
//             transparent={false}
//             presentationStyle="fullScreen"
//             statusBarTranslucent
//             onRequestClose={() => setShowRecreatedModal(false)}>
//             <RecreatedLookScreen
//               route={{params: {data: recreatedData}}}
//               navigation={{goBack: () => setShowRecreatedModal(false)}}
//             />
//           </Modal>
//         )}
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

///////////////////////

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
//   Modal,
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
// import AllSavedLooksModal from '../components/AllSavedLooksModal/AllSavedLooksModal';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {searchProducts} from '../services/productSearchClient';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {Linking} from 'react-native';
// import type {ProductResult} from '../services/productSearchClient';
// import ShopModal from '../components/ShopModal/ShopModal';
// import {Share} from 'react-native';
// import ViewShot from 'react-native-view-shot';
// import PersonalizedShopModal from '../components/PersonalizedShopModal/PersonalizedShopModal';
// import RecreatedLookScreen from './RecreatedLookScreen';
// import {Camera} from 'react-native-vision-camera';

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

//   useEffect(() => {
//     (async () => {
//       const status = await Camera.getCameraPermissionStatus();
//       console.log('🔒 Camera permission status:', status);
//       if (status !== 'authorized') {
//         const newStatus = await Camera.requestCameraPermission();
//         console.log('🔓 New camera permission:', newStatus);
//       }
//     })();
//   }, []);

//   // Simple inline collapsible wrapper — smooth open/close animation
//   const CollapsibleSection: React.FC<{
//     title?: string;
//     children: React.ReactNode;
//     defaultOpen?: boolean;
//   }> = ({title, children, defaultOpen = true}) => {
//     const [open, setOpen] = useState(defaultOpen);
//     const animatedHeight = useRef(
//       new Animated.Value(defaultOpen ? 1 : 0),
//     ).current;

//     const toggle = () => {
//       Animated.timing(animatedHeight, {
//         toValue: open ? 0 : 1,
//         duration: 260,
//         easing: Easing.out(Easing.quad),
//         useNativeDriver: false,
//       }).start(() => setOpen(!open));
//     };

//     const height = animatedHeight.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, 1],
//     });

//     return (
//       <View
//         style={[
//           {
//             overflow: 'hidden',
//             backgroundColor: theme.colors.background,
//             marginBottom: open ? 4 : 20, // ✅ only when collapsed
//           },
//         ]}>
//         <View style={{marginBottom: 2}}>
//           {title && (
//             <TouchableOpacity
//               activeOpacity={0.7}
//               onPress={toggle}
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'flex-start',
//               }}>
//               <Text
//                 style={[
//                   // globalStyles.sectionTitle,
//                   {
//                     color: theme.colors.foreground,
//                     fontSize: 16,
//                     fontWeight: '700',
//                     paddingHorizontal: 20,
//                     textTransform: 'none',
//                   },
//                 ]}>
//                 {title}
//               </Text>

//               <Animated.View
//                 style={{
//                   transform: [
//                     {
//                       rotateZ: animatedHeight.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: ['0deg', '180deg'],
//                       }),
//                     },
//                   ],
//                 }}>
//                 <Icon
//                   name="keyboard-arrow-down"
//                   size={28}
//                   color={theme.colors.foreground}
//                   style={{paddingHorizontal: 20}}
//                 />
//               </Animated.View>
//             </TouchableOpacity>
//           )}
//         </View>

//         <Animated.View
//           style={{
//             opacity: animatedHeight,
//             transform: [
//               {
//                 scaleY: animatedHeight.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [0.96, 1],
//                 }),
//               },
//             ],
//           }}>
//           {open && children}
//         </Animated.View>
//       </View>
//     );
//   };

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
//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [shopResults, setShopResults] = useState<ProductResult[]>([]);

//   const [personalizedVisible, setPersonalizedVisible] = useState(false);
//   const [personalizedPurchases, setPersonalizedPurchases] = useState<any[]>([]);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const {recreateLook, loading: recreating} = useRecreateLook();
//   const [recreatedData, setRecreatedData] = useState<any | null>(null);
//   const [showRecreatedModal, setShowRecreatedModal] = useState(false);

//   const [shopVisible, setShopVisible] = useState(false);
//   const [recentVibes, setRecentVibes] = useState([]);
//   const [loadingVibes, setLoadingVibes] = useState(false);
//   const [recentCreations, setRecentCreations] = useState<any[]>([]);
//   const [loadingCreations, setLoadingCreations] = useState(false);

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
//     const loadRecentVibes = async () => {
//       if (!userId) return;
//       setLoadingVibes(true);
//       try {
//         console.log('[RecentVibes] Fetching for user:', userId);
//         const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`);
//         const json = await res.json();
//         console.log('[RecentVibes] API Response:', json);

//         if (json?.data?.length) {
//           setRecentVibes(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentVibes(json);
//         } else {
//           console.warn('[RecentVibes] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentVibes] Load failed:', err);
//       } finally {
//         setLoadingVibes(false);
//       }
//     };
//     loadRecentVibes();
//   }, [userId]);

//   useEffect(() => {
//     const loadRecentCreations = async () => {
//       console.log;
//       if (!userId) return;
//       setLoadingCreations(true);
//       try {
//         console.log('[RecentCreations] Fetching for user:', userId);
//         const res = await fetch(
//           `${API_BASE_URL}/users/${userId}/recreated-looks`,
//         );
//         const json = await res.json();
//         console.log('[RecentCreations] API Response:', json);

//         if (json?.data?.length) {
//           setRecentCreations(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentCreations(json);
//         } else {
//           console.warn('[RecentCreations] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentCreations] Load failed:', err);
//       } finally {
//         setLoadingCreations(false);
//       }
//     };
//     loadRecentCreations();
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

//   const openPersonalizedShopModal = (data: PersonalizedResult) => {
//     if (!data) return;

//     const normalized: PersonalizedResult = {
//       recreated_outfit: Array.isArray(data.recreated_outfit)
//         ? [...data.recreated_outfit]
//         : [],
//       suggested_purchases: Array.isArray(data.suggested_purchases)
//         ? [...data.suggested_purchases]
//         : [],
//       style_note: data.style_note ?? '',
//       tags: data.tags ?? [],
//     };

//     console.log('💎 Opening Personalized Shop Modal with:', normalized);

//     setPersonalizedPurchases(JSON.parse(JSON.stringify(normalized)));

//     setTimeout(() => {
//       setPersonalizedVisible(true);
//     }, 100);
//   };

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

//   // 🧥 Recreate Look
//   const handleRecreateLook = async ({image_url, tags}) => {
//     try {
//       console.log('[Home] Recreate from Saved Look:', image_url, tags);
//       const result = await recreateLook({user_id: userId, tags, image_url});
//       console.log('[Home] Recreated outfit result:', result);

//       // 💾 Save recreated look for recall
//       if (userId && result) {
//         try {
//           const payload = {
//             source_image_url: image_url,
//             generated_outfit: result,
//             tags,
//           };
//           console.log('💾 [RecreateSave] POST payload:', payload);

//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/recreated-looks`,
//             {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify(payload),
//             },
//           );

//           const json = await res.json();
//           console.log('💾 [RecreateSave] response:', json);
//         } catch (err) {
//           console.error('❌ [RecreateSave] failed:', err);
//         }
//       }

//       // 👇 Instead of navigation
//       setRecreatedData(result);
//       setShowRecreatedModal(true);
//     } catch (err) {
//       console.error('[Home] Failed to recreate:', err);
//     }
//   };

//   // 🛍️ Shop The Vibe
//   const handleShopModal = async (tags?: string[]) => {
//     try {
//       // ReactNativeHapticFeedback.trigger('impactMedium');
//       console.log('[Home] Shop tags:', tags);

//       const query = tags && tags.length > 0 ? tags.join(' ') : 'outfit';
//       const results = await searchProducts(query);
//       console.log('[Home] Shop results:', results);

//       if (results && results.length > 0) {
//         setShopResults(results); // ✅ saves results to modal state
//         setShopVisible(true); // ✅ opens modal
//       } else {
//         console.warn('[Home] No products found for', query);
//       }
//     } catch (err) {
//       console.error('[Home] Shop modal failed:', err);
//     }
//   };

//   const handleShareVibe = async vibe => {
//     try {
//       ReactNativeHapticFeedback.trigger('impactLight');

//       const imageUri = vibe.source_image_url || vibe.image_url;

//       if (!imageUri) {
//         console.warn('⚠️ No image URL found for vibe:', vibe);
//         Toast.show('This vibe has no image to share ❌', {
//           duration: Toast.durations.SHORT,
//           position: Toast.positions.BOTTOM,
//         });
//         return;
//       }

//       await Share.share({
//         url: imageUri,
//         message: `Just created this vibe ✨ with StylHelpr AI – ${
//           (vibe.tags && vibe.tags.slice(0, 3).join(', ')) ||
//           vibe.query_used ||
//           'New Look'
//         }`,
//         title: 'Share Your Vibe',
//       });

//       Toast.show('Vibe shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing vibe:', err);
//       Toast.show('Error sharing vibe ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

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

//         {/* 🍎 Weather Section — Clean, Glanceable, Non-Redundant */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>

//             {weather && (
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {paddingVertical: 18, paddingHorizontal: 20},
//                 ]}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   {/* 🌤️ Left column — City, Condition, Icon */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       flex: 1,
//                     }}>
//                     <Icon
//                       name={(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain') return 'umbrella';
//                         if (condition === 'Snow') return 'ac-unit';
//                         if (condition === 'Clouds') return 'wb-cloudy';
//                         if (condition === 'Clear') return 'wb-sunny';
//                         return 'wb-sunny';
//                       })()}
//                       size={36}
//                       color={theme.colors.foreground}
//                       style={{marginRight: 10}}
//                     />
//                     <View>
//                       <Text
//                         style={[
//                           styles.weatherCity,
//                           {fontSize: 20, fontWeight: '700'},
//                         ]}>
//                         {weather.celsius.name}
//                       </Text>
//                       <Text
//                         style={{
//                           fontSize: 16,
//                           color: theme.colors.foreground2,
//                           textTransform: 'capitalize',
//                         }}>
//                         {weather.celsius.weather[0].description}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* 🌡️ Right column — Big Temp */}
//                   <View style={styles.weatherTempContainer}>
//                     <Text
//                       style={{
//                         fontSize: 34,
//                         fontWeight: '800',
//                         color: theme.colors.buttonText1,
//                       }}>
//                       {Math.round(weather.fahrenheit.main.temp)}°F
//                     </Text>
//                   </View>
//                 </View>

//                 {/* 👇 Optional: short vibe line (kept minimal & non-overlapping) */}
//                 <View style={{marginTop: 12}}>
//                   <Text
//                     style={{
//                       fontSize: 15,
//                       color: theme.colors.foreground2,
//                       fontWeight: '500',
//                     }}>
//                     {(() => {
//                       const temp = weather.fahrenheit.main.temp;
//                       const condition = weather.celsius.weather[0].main;

//                       if (temp < 25) return '❄️ Brutally Cold';
//                       if (temp < 32)
//                         return condition === 'Snow'
//                           ? '🌨 Freezing & Snowy'
//                           : '🥶 Freezing';
//                       if (temp < 40)
//                         return condition === 'Clouds'
//                           ? '☁️ Bitter & Overcast'
//                           : '🧤 Bitter Cold';
//                       if (temp < 50)
//                         return condition === 'Rain'
//                           ? '🌧 Cold & Wet'
//                           : '🧥 Chilly';
//                       if (temp < 60)
//                         return condition === 'Clouds'
//                           ? '🌥 Cool & Cloudy'
//                           : '🌤 Crisp & Cool';
//                       if (temp < 70)
//                         return condition === 'Clear'
//                           ? '☀️ Mild & Bright'
//                           : '🌤 Mild';
//                       if (temp < 80)
//                         return condition === 'Clear'
//                           ? '☀️ Warm & Clear'
//                           : '🌦 Warm';
//                       if (temp < 90)
//                         return condition === 'Rain'
//                           ? '🌦 Hot & Humid'
//                           : '🔥 Hot';
//                       if (temp < 100) return '🥵 Very Hot';
//                       return '🌋 Extreme Heat';
//                     })()}
//                   </Text>
//                 </View>
//               </View>
//             )}
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
//                   // backgroundColor: theme.colors.surface3,
//                   // borderWidth: tokens.borderWidth.sm,
//                   // borderColor: theme.colors.surfaceBorder,
//                 }}>
//                 <View
//                   style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                   {/* <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                       fontSize: 13,
//                     }}>
//                     {mapOpen ? 'Close' : 'Open'}
//                   </Text> */}
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={30}
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

//         <Text
//           style={[
//             globalStyles.sectionTitle,
//             {marginLeft: 20, marginBottom: 16},
//           ]}>
//           Your Looks
//         </Text>

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <CollapsibleSection title="Saved Looks">
//             <Animatable.View
//               animation="fadeInUp"
//               delay={800}
//               duration={700}
//               useNativeDriver
//               style={[globalStyles.sectionScroll, {marginBottom: 12}]}>
//               {/* <View style={{flexDirection: 'row'}}>
//                 <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//               </View> */}

//               {savedLooks.length === 0 ? (
//                 <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                   <Text style={globalStyles.missingDataMessage1}>
//                     No saved looks.
//                   </Text>
//                   <TooltipBubble
//                     message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                     position="top"
//                   />
//                 </View>
//               ) : (
//                 <ScrollView
//                   horizontal
//                   showsHorizontalScrollIndicator={false}
//                   contentContainerStyle={{paddingRight: 8}}>
//                   {savedLooks.map((look, index) => (
//                     <Animatable.View
//                       key={look.id}
//                       animation="fadeInUp"
//                       delay={900 + index * 100}
//                       useNativeDriver
//                       style={globalStyles.outfitCard}>
//                       <AppleTouchFeedback
//                         hapticStyle="impactLight"
//                         onPress={() => {
//                           setSelectedLook(look);
//                           setPreviewVisible(true);
//                         }}
//                         style={{alignItems: 'center'}}>
//                         <View>
//                           <Image
//                             source={{uri: look.image_url}}
//                             style={[
//                               globalStyles.image4,
//                               {
//                                 borderColor: theme.colors.surfaceBorder,
//                                 borderWidth: tokens.borderWidth.md,
//                                 borderRadius: tokens.borderRadius.md,
//                               },
//                             ]}
//                             resizeMode="cover"
//                           />
//                         </View>
//                         <Text style={[globalStyles.subLabel]} numberOfLines={1}>
//                           {look.name}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </ScrollView>
//               )}
//               {savedLooks.length > 0 && (
//                 <TouchableOpacity
//                   onPress={() => setImageModalVisible(true)}
//                   style={{
//                     alignSelf: 'flex-end',
//                     marginTop: 8,
//                     marginRight: 12,
//                   }}>
//                   <Text
//                     style={{
//                       fontSize: 13,
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                     }}>
//                     See All Saved Looks
//                   </Text>
//                 </TouchableOpacity>
//               )}
//             </Animatable.View>
//           </CollapsibleSection>
//         )}

//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={1000}
//             duration={700}
//             useNativeDriver
//             style={{alignItems: 'center', marginBottom: 20}}>
//             <AppleTouchFeedback
//               style={[globalStyles.buttonPrimary4, {width: 90, marginTop: -12}]}
//               hapticStyle="impactHeavy"
//               onPress={() => setSaveModalVisible(true)}>
//               <Text style={globalStyles.buttonPrimaryText4}>Add Look</Text>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         )}

//         {/* RECENT CREATED VIBES SECTION*/}
//         {loadingCreations && (
//           <Animatable.View
//             animation="fadeIn"
//             duration={400}
//             useNativeDriver
//             style={{padding: 16, alignItems: 'center'}}>
//             <Text style={{color: theme.colors.foreground2}}>
//               Loading recent creations...
//             </Text>
//           </Animatable.View>
//         )}

//         {!loadingCreations && recentCreations.length > 0 && (
//           <CollapsibleSection title="Recently Created Vibe">
//             <Animatable.View
//               animation="fadeInUp"
//               delay={150}
//               duration={600}
//               useNativeDriver
//               style={globalStyles.section}>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {recentCreations.map(c => (
//                   <TouchableOpacity
//                     key={c.id}
//                     onPress={() =>
//                       navigate('RecreatedLook', {data: c.generated_outfit})
//                     }
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactLight');
//                         navigate('RecreatedLook', {data: c.generated_outfit});
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <Image
//                         source={{uri: c.source_image_url}}
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
//                     </AppleTouchFeedback>
//                     {/* 👇 ADD THIS just below the image */}
//                     <TouchableOpacity
//                       onPress={() => handleShareVibe(c)}
//                       style={{
//                         position: 'absolute',
//                         top: 6,
//                         right: 6,
//                         backgroundColor: 'rgba(0,0,0,0.4)',
//                         borderRadius: 20,
//                         padding: 6,
//                       }}>
//                       <Icon name="ios-share" size={20} color="#fff" />
//                     </TouchableOpacity>

//                     <Text
//                       numberOfLines={1}
//                       style={[
//                         globalStyles.subLabel,
//                         {marginTop: 6, textAlign: 'center'},
//                       ]}>
//                       {(c.tags && c.tags.slice(0, 3).join(' ')) || 'AI Look'}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             </Animatable.View>
//           </CollapsibleSection>
//         )}

//         {/* RECENT SHOP VIBES SECTION */}
//         {loadingVibes && (
//           <Animatable.View
//             animation="fadeIn"
//             duration={400}
//             useNativeDriver
//             style={{padding: 16, alignItems: 'center'}}>
//             <Text style={{color: theme.colors.foreground2}}>
//               Loading recent vibes...
//             </Text>
//           </Animatable.View>
//         )}

//         {!loadingVibes && recentVibes.length > 0 && (
//           <CollapsibleSection title="Recently Shopped Vibe">
//             <Animatable.View
//               animation="fadeInUp"
//               delay={150}
//               duration={600}
//               useNativeDriver
//               style={globalStyles.section}>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {recentVibes.map((vibe, index) => (
//                   <Animatable.View
//                     key={vibe.id || index}
//                     animation="fadeIn"
//                     delay={200 + index * 80}
//                     duration={400}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <TouchableOpacity
//                       activeOpacity={0.85}
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactMedium');
//                         handleShopModal([vibe.query_used]);
//                       }}>
//                       <AppleTouchFeedback
//                         hapticStyle="impactMedium"
//                         onPress={() => {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           handleShopModal([vibe.query_used]);
//                         }}
//                         style={{alignItems: 'center'}}>
//                         <Image
//                           source={{uri: vibe.image_url}}
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
//                         {/* 👇 Add share button */}
//                         <TouchableOpacity
//                           onPress={() => handleShareVibe(vibe)}
//                           style={{
//                             position: 'absolute',
//                             top: 6,
//                             right: 6,
//                             backgroundColor: 'rgba(0,0,0,0.4)',
//                             borderRadius: 20,
//                             padding: 6,
//                           }}>
//                           <Icon name="ios-share" size={20} color="#fff" />
//                         </TouchableOpacity>
//                       </AppleTouchFeedback>

//                       <Text
//                         numberOfLines={1}
//                         style={[
//                           globalStyles.subLabel,
//                           {marginTop: 6, textAlign: 'center'},
//                         ]}>
//                         {vibe.query_used?.split(' ').slice(0, 3).join(' ') ||
//                           'Recent'}
//                       </Text>
//                     </TouchableOpacity>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             </Animatable.View>
//           </CollapsibleSection>
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
//         <AllSavedLooksModal
//           visible={imageModalVisible}
//           onClose={() => setImageModalVisible(false)}
//           savedLooks={savedLooks}
//           recreateLook={handleRecreateLook}
//           openShopModal={handleShopModal}
//           shopResults={shopResults}
//           openPersonalizedShopModal={openPersonalizedShopModal} // ✅ add this
//         />
//         <ShopModal
//           visible={shopVisible}
//           onClose={() => setShopVisible(false)}
//           results={shopResults}
//         />
//         {/* <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={personalizedPurchases}
//         /> */}
//         <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={
//             personalizedPurchases?.purchases ??
//             personalizedPurchases?.suggested_purchases ??
//             []
//           }
//           recreatedOutfit={
//             personalizedPurchases?.recreatedOutfit ??
//             personalizedPurchases?.recreated_outfit ??
//             []
//           }
//           styleNote={
//             personalizedPurchases?.styleNote ??
//             personalizedPurchases?.style_note ??
//             ''
//           }
//         />

//         {showRecreatedModal && recreatedData && (
//           <Modal
//             visible={showRecreatedModal}
//             animationType="slide"
//             transparent={false}
//             presentationStyle="fullScreen"
//             statusBarTranslucent
//             onRequestClose={() => setShowRecreatedModal(false)}>
//             <RecreatedLookScreen
//               route={{params: {data: recreatedData}}}
//               navigation={{goBack: () => setShowRecreatedModal(false)}}
//             />
//           </Modal>
//         )}
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

////////////////////

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
//   Modal,
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
// import AllSavedLooksModal from '../components/AllSavedLooksModal/AllSavedLooksModal';
// import {useRecreateLook} from '../hooks/useRecreateLook';
// import {searchProducts} from '../services/productSearchClient';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {Linking} from 'react-native';
// import type {ProductResult} from '../services/productSearchClient';
// import ShopModal from '../components/ShopModal/ShopModal';
// import {Share} from 'react-native';
// import ViewShot from 'react-native-view-shot';
// import PersonalizedShopModal from '../components/PersonalizedShopModal/PersonalizedShopModal';
// import RecreatedLookScreen from './RecreatedLookScreen';

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

//   // Simple inline collapsible wrapper — smooth open/close animation
//   const CollapsibleSection: React.FC<{
//     title?: string;
//     children: React.ReactNode;
//     defaultOpen?: boolean;
//   }> = ({title, children, defaultOpen = true}) => {
//     const [open, setOpen] = useState(defaultOpen);
//     const animatedHeight = useRef(
//       new Animated.Value(defaultOpen ? 1 : 0),
//     ).current;

//     const toggle = () => {
//       Animated.timing(animatedHeight, {
//         toValue: open ? 0 : 1,
//         duration: 260,
//         easing: Easing.out(Easing.quad),
//         useNativeDriver: false,
//       }).start(() => setOpen(!open));
//     };

//     const height = animatedHeight.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, 1],
//     });

//     return (
//       <View
//         style={[
//           {
//             overflow: 'hidden',
//             backgroundColor: theme.colors.background,
//             marginBottom: open ? 4 : 20, // ✅ only when collapsed
//           },
//         ]}>
//         <View style={{marginBottom: 2}}>
//           {title && (
//             <TouchableOpacity
//               activeOpacity={0.7}
//               onPress={toggle}
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'flex-start',
//               }}>
//               <Text
//                 style={[
//                   // globalStyles.sectionTitle,
//                   {
//                     color: theme.colors.foreground,
//                     fontSize: 16,
//                     fontWeight: '700',
//                     paddingHorizontal: 20,
//                     textTransform: 'none',
//                   },
//                 ]}>
//                 {title}
//               </Text>

//               <Animated.View
//                 style={{
//                   transform: [
//                     {
//                       rotateZ: animatedHeight.interpolate({
//                         inputRange: [0, 1],
//                         outputRange: ['0deg', '180deg'],
//                       }),
//                     },
//                   ],
//                 }}>
//                 <Icon
//                   name="keyboard-arrow-down"
//                   size={28}
//                   color={theme.colors.foreground}
//                   style={{paddingHorizontal: 20}}
//                 />
//               </Animated.View>
//             </TouchableOpacity>
//           )}
//         </View>

//         <Animated.View
//           style={{
//             opacity: animatedHeight,
//             transform: [
//               {
//                 scaleY: animatedHeight.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [0.96, 1],
//                 }),
//               },
//             ],
//           }}>
//           {open && children}
//         </Animated.View>
//       </View>
//     );
//   };

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
//   const [imageModalVisible, setImageModalVisible] = useState(false);
//   const [shopResults, setShopResults] = useState<ProductResult[]>([]);

//   const [personalizedVisible, setPersonalizedVisible] = useState(false);
//   const [personalizedPurchases, setPersonalizedPurchases] = useState<any[]>([]);

//   // Map dropdown state & animations
//   // DEAFULT OPEN STATE
//   const [mapVisible, setMapVisible] = useState(true);
//   const chevron = useRef(new Animated.Value(1)).current;
//   const mapHeight = useRef(new Animated.Value(220)).current;
//   const mapOpacity = useRef(new Animated.Value(1)).current;
//   const [mapOpen, setMapOpen] = useState(true);

//   const {recreateLook, loading: recreating} = useRecreateLook();
//   const [recreatedData, setRecreatedData] = useState<any | null>(null);
//   const [showRecreatedModal, setShowRecreatedModal] = useState(false);

//   const [shopVisible, setShopVisible] = useState(false);
//   const [recentVibes, setRecentVibes] = useState([]);
//   const [loadingVibes, setLoadingVibes] = useState(false);
//   const [recentCreations, setRecentCreations] = useState<any[]>([]);
//   const [loadingCreations, setLoadingCreations] = useState(false);

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
//     const loadRecentVibes = async () => {
//       if (!userId) return;
//       setLoadingVibes(true);
//       try {
//         console.log('[RecentVibes] Fetching for user:', userId);
//         const res = await fetch(`${API_BASE_URL}/users/${userId}/look-memory`);
//         const json = await res.json();
//         console.log('[RecentVibes] API Response:', json);

//         if (json?.data?.length) {
//           setRecentVibes(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentVibes(json);
//         } else {
//           console.warn('[RecentVibes] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentVibes] Load failed:', err);
//       } finally {
//         setLoadingVibes(false);
//       }
//     };
//     loadRecentVibes();
//   }, [userId]);

//   useEffect(() => {
//     const loadRecentCreations = async () => {
//       console.log;
//       if (!userId) return;
//       setLoadingCreations(true);
//       try {
//         console.log('[RecentCreations] Fetching for user:', userId);
//         const res = await fetch(
//           `${API_BASE_URL}/users/${userId}/recreated-looks`,
//         );
//         const json = await res.json();
//         console.log('[RecentCreations] API Response:', json);

//         if (json?.data?.length) {
//           setRecentCreations(json.data);
//         } else if (Array.isArray(json)) {
//           setRecentCreations(json);
//         } else {
//           console.warn('[RecentCreations] Unexpected shape:', json);
//         }
//       } catch (err) {
//         console.error('[RecentCreations] Load failed:', err);
//       } finally {
//         setLoadingCreations(false);
//       }
//     };
//     loadRecentCreations();
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

//   const openPersonalizedShopModal = (data: PersonalizedResult) => {
//     if (!data) return;

//     const normalized: PersonalizedResult = {
//       recreated_outfit: Array.isArray(data.recreated_outfit)
//         ? [...data.recreated_outfit]
//         : [],
//       suggested_purchases: Array.isArray(data.suggested_purchases)
//         ? [...data.suggested_purchases]
//         : [],
//       style_note: data.style_note ?? '',
//       tags: data.tags ?? [],
//     };

//     console.log('💎 Opening Personalized Shop Modal with:', normalized);

//     setPersonalizedPurchases(JSON.parse(JSON.stringify(normalized)));

//     setTimeout(() => {
//       setPersonalizedVisible(true);
//     }, 100);
//   };

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

//   // 🧥 Recreate Look
//   const handleRecreateLook = async ({image_url, tags}) => {
//     try {
//       console.log('[Home] Recreate from Saved Look:', image_url, tags);
//       const result = await recreateLook({user_id: userId, tags, image_url});
//       console.log('[Home] Recreated outfit result:', result);

//       // 💾 Save recreated look for recall
//       if (userId && result) {
//         try {
//           const payload = {
//             source_image_url: image_url,
//             generated_outfit: result,
//             tags,
//           };
//           console.log('💾 [RecreateSave] POST payload:', payload);

//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/recreated-looks`,
//             {
//               method: 'POST',
//               headers: {'Content-Type': 'application/json'},
//               body: JSON.stringify(payload),
//             },
//           );

//           const json = await res.json();
//           console.log('💾 [RecreateSave] response:', json);
//         } catch (err) {
//           console.error('❌ [RecreateSave] failed:', err);
//         }
//       }

//       // 👇 Instead of navigation
//       setRecreatedData(result);
//       setShowRecreatedModal(true);
//     } catch (err) {
//       console.error('[Home] Failed to recreate:', err);
//     }
//   };

//   // 🛍️ Shop The Vibe
//   const handleShopModal = async (tags?: string[]) => {
//     try {
//       // ReactNativeHapticFeedback.trigger('impactMedium');
//       console.log('[Home] Shop tags:', tags);

//       const query = tags && tags.length > 0 ? tags.join(' ') : 'outfit';
//       const results = await searchProducts(query);
//       console.log('[Home] Shop results:', results);

//       if (results && results.length > 0) {
//         setShopResults(results); // ✅ saves results to modal state
//         setShopVisible(true); // ✅ opens modal
//       } else {
//         console.warn('[Home] No products found for', query);
//       }
//     } catch (err) {
//       console.error('[Home] Shop modal failed:', err);
//     }
//   };

//   const handleShareVibe = async vibe => {
//     try {
//       ReactNativeHapticFeedback.trigger('impactLight');

//       const imageUri = vibe.source_image_url || vibe.image_url;

//       if (!imageUri) {
//         console.warn('⚠️ No image URL found for vibe:', vibe);
//         Toast.show('This vibe has no image to share ❌', {
//           duration: Toast.durations.SHORT,
//           position: Toast.positions.BOTTOM,
//         });
//         return;
//       }

//       await Share.share({
//         url: imageUri,
//         message: `Just created this vibe ✨ with StylHelpr AI – ${
//           (vibe.tags && vibe.tags.slice(0, 3).join(', ')) ||
//           vibe.query_used ||
//           'New Look'
//         }`,
//         title: 'Share Your Vibe',
//       });

//       Toast.show('Vibe shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing vibe:', err);
//       Toast.show('Error sharing vibe ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

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

//         {/* 🍎 Weather Section — Clean, Glanceable, Non-Redundant */}
//         {prefs.weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={700}
//             delay={200}
//             useNativeDriver
//             style={globalStyles.section}>
//             <Text style={globalStyles.sectionTitle}>Weather</Text>

//             {weather && (
//               <View
//                 style={[
//                   globalStyles.cardStyles1,
//                   {paddingVertical: 18, paddingHorizontal: 20},
//                 ]}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                   }}>
//                   {/* 🌤️ Left column — City, Condition, Icon */}
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       alignItems: 'center',
//                       flex: 1,
//                     }}>
//                     <Icon
//                       name={(() => {
//                         const condition = weather.celsius.weather[0].main;
//                         if (condition === 'Rain') return 'umbrella';
//                         if (condition === 'Snow') return 'ac-unit';
//                         if (condition === 'Clouds') return 'wb-cloudy';
//                         if (condition === 'Clear') return 'wb-sunny';
//                         return 'wb-sunny';
//                       })()}
//                       size={36}
//                       color={theme.colors.foreground}
//                       style={{marginRight: 10}}
//                     />
//                     <View>
//                       <Text
//                         style={[
//                           styles.weatherCity,
//                           {fontSize: 20, fontWeight: '700'},
//                         ]}>
//                         {weather.celsius.name}
//                       </Text>
//                       <Text
//                         style={{
//                           fontSize: 16,
//                           color: theme.colors.foreground2,
//                           textTransform: 'capitalize',
//                         }}>
//                         {weather.celsius.weather[0].description}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* 🌡️ Right column — Big Temp */}
//                   <View style={styles.weatherTempContainer}>
//                     <Text
//                       style={{
//                         fontSize: 34,
//                         fontWeight: '800',
//                         color: theme.colors.buttonText1,
//                       }}>
//                       {Math.round(weather.fahrenheit.main.temp)}°F
//                     </Text>
//                   </View>
//                 </View>

//                 {/* 👇 Optional: short vibe line (kept minimal & non-overlapping) */}
//                 <View style={{marginTop: 12}}>
//                   <Text
//                     style={{
//                       fontSize: 15,
//                       color: theme.colors.foreground2,
//                       fontWeight: '500',
//                     }}>
//                     {(() => {
//                       const temp = weather.fahrenheit.main.temp;
//                       const condition = weather.celsius.weather[0].main;

//                       if (temp < 25) return '❄️ Brutally Cold';
//                       if (temp < 32)
//                         return condition === 'Snow'
//                           ? '🌨 Freezing & Snowy'
//                           : '🥶 Freezing';
//                       if (temp < 40)
//                         return condition === 'Clouds'
//                           ? '☁️ Bitter & Overcast'
//                           : '🧤 Bitter Cold';
//                       if (temp < 50)
//                         return condition === 'Rain'
//                           ? '🌧 Cold & Wet'
//                           : '🧥 Chilly';
//                       if (temp < 60)
//                         return condition === 'Clouds'
//                           ? '🌥 Cool & Cloudy'
//                           : '🌤 Crisp & Cool';
//                       if (temp < 70)
//                         return condition === 'Clear'
//                           ? '☀️ Mild & Bright'
//                           : '🌤 Mild';
//                       if (temp < 80)
//                         return condition === 'Clear'
//                           ? '☀️ Warm & Clear'
//                           : '🌦 Warm';
//                       if (temp < 90)
//                         return condition === 'Rain'
//                           ? '🌦 Hot & Humid'
//                           : '🔥 Hot';
//                       if (temp < 100) return '🥵 Very Hot';
//                       return '🌋 Extreme Heat';
//                     })()}
//                   </Text>
//                 </View>
//               </View>
//             )}
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
//                   // backgroundColor: theme.colors.surface3,
//                   // borderWidth: tokens.borderWidth.sm,
//                   // borderColor: theme.colors.surfaceBorder,
//                 }}>
//                 <View
//                   style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
//                   {/* <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                       fontSize: 13,
//                     }}>
//                     {mapOpen ? 'Close' : 'Open'}
//                   </Text> */}
//                   <Animated.View style={{transform: [{rotateZ}]}}>
//                     <Icon
//                       name="keyboard-arrow-down"
//                       size={30}
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

//         <Text
//           style={[
//             globalStyles.sectionTitle,
//             {marginLeft: 20, marginBottom: 16},
//           ]}>
//           Your Looks
//         </Text>

//         {/* Saved Looks Section */}
//         {prefs.savedLooks && (
//           <CollapsibleSection title="Saved Looks">
//             <Animatable.View
//               animation="fadeInUp"
//               delay={800}
//               duration={700}
//               useNativeDriver
//               style={[globalStyles.sectionScroll, {marginBottom: 12}]}>
//               {/* <View style={{flexDirection: 'row'}}>
//                 <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//               </View> */}

//               {savedLooks.length === 0 ? (
//                 <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//                   <Text style={globalStyles.missingDataMessage1}>
//                     No saved looks.
//                   </Text>
//                   <TooltipBubble
//                     message='You haven’t saved any looks yet. Tap the "Add Look" button below to add your
//               favorite looks.'
//                     position="top"
//                   />
//                 </View>
//               ) : (
//                 <ScrollView
//                   horizontal
//                   showsHorizontalScrollIndicator={false}
//                   contentContainerStyle={{paddingRight: 8}}>
//                   {savedLooks.map((look, index) => (
//                     <Animatable.View
//                       key={look.id}
//                       animation="fadeInUp"
//                       delay={900 + index * 100}
//                       useNativeDriver
//                       style={globalStyles.outfitCard}>
//                       <AppleTouchFeedback
//                         hapticStyle="impactLight"
//                         onPress={() => {
//                           setSelectedLook(look);
//                           setPreviewVisible(true);
//                         }}
//                         style={{alignItems: 'center'}}>
//                         <View>
//                           <Image
//                             source={{uri: look.image_url}}
//                             style={[
//                               globalStyles.image4,
//                               {
//                                 borderColor: theme.colors.surfaceBorder,
//                                 borderWidth: tokens.borderWidth.md,
//                                 borderRadius: tokens.borderRadius.md,
//                               },
//                             ]}
//                             resizeMode="cover"
//                           />
//                         </View>
//                         <Text style={[globalStyles.subLabel]} numberOfLines={1}>
//                           {look.name}
//                         </Text>
//                       </AppleTouchFeedback>
//                     </Animatable.View>
//                   ))}
//                 </ScrollView>
//               )}
//               {savedLooks.length > 0 && (
//                 <TouchableOpacity
//                   onPress={() => setImageModalVisible(true)}
//                   style={{
//                     alignSelf: 'flex-end',
//                     marginTop: 8,
//                     marginRight: 12,
//                   }}>
//                   <Text
//                     style={{
//                       fontSize: 13,
//                       color: theme.colors.foreground,
//                       fontWeight: '700',
//                     }}>
//                     See All Saved Looks
//                   </Text>
//                 </TouchableOpacity>
//               )}
//             </Animatable.View>
//           </CollapsibleSection>
//         )}

//         {prefs.savedLooks && (
//           <Animatable.View
//             animation="fadeInUp"
//             delay={1000}
//             duration={700}
//             useNativeDriver
//             style={{alignItems: 'center', marginBottom: 20}}>
//             <AppleTouchFeedback
//               style={[globalStyles.buttonPrimary4, {width: 90, marginTop: -12}]}
//               hapticStyle="impactHeavy"
//               onPress={() => setSaveModalVisible(true)}>
//               <Text style={globalStyles.buttonPrimaryText4}>Add Look</Text>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         )}

//         {/* RECENT CREATED VIBES SECTION*/}
//         {loadingCreations && (
//           <View style={{padding: 16, alignItems: 'center'}}>
//             <Text style={{color: theme.colors.foreground2}}>
//               Loading recent creations...
//             </Text>
//           </View>
//         )}

//         {!loadingCreations && recentCreations.length > 0 && (
//           <CollapsibleSection title="Recently Created Vibe">
//             <View style={globalStyles.section}>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {recentCreations.map(c => (
//                   <TouchableOpacity
//                     key={c.id}
//                     onPress={() =>
//                       navigate('RecreatedLook', {data: c.generated_outfit})
//                     }
//                     style={globalStyles.outfitCard}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactLight');
//                         navigate('RecreatedLook', {data: c.generated_outfit});
//                       }}
//                       style={{alignItems: 'center'}}>
//                       <Image
//                         source={{uri: c.source_image_url}}
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
//                     </AppleTouchFeedback>
//                     {/* 👇 ADD THIS just below the image */}
//                     <TouchableOpacity
//                       onPress={() => handleShareVibe(c)}
//                       style={{
//                         position: 'absolute',
//                         top: 6,
//                         right: 6,
//                         backgroundColor: 'rgba(0,0,0,0.4)',
//                         borderRadius: 20,
//                         padding: 6,
//                       }}>
//                       <Icon name="ios-share" size={20} color="#fff" />
//                     </TouchableOpacity>

//                     <Text
//                       numberOfLines={1}
//                       style={[
//                         globalStyles.subLabel,
//                         {marginTop: 6, textAlign: 'center'},
//                       ]}>
//                       {(c.tags && c.tags.slice(0, 3).join(' ')) || 'AI Look'}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             </View>
//           </CollapsibleSection>
//         )}

//         {/* RECENT SHOP VIBES SECTION */}
//         {loadingVibes && (
//           <Animatable.View
//             animation="fadeIn"
//             duration={400}
//             useNativeDriver
//             style={{padding: 16, alignItems: 'center'}}>
//             <Text style={{color: theme.colors.foreground2}}>
//               Loading recent vibes...
//             </Text>
//           </Animatable.View>
//         )}

//         {!loadingVibes && recentVibes.length > 0 && (
//           <CollapsibleSection title="Recently Shopped Vibe">
//             <Animatable.View
//               animation="fadeInUp"
//               delay={150}
//               duration={600}
//               useNativeDriver
//               style={globalStyles.section}>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {recentVibes.map((vibe, index) => (
//                   <Animatable.View
//                     key={vibe.id || index}
//                     animation="fadeIn"
//                     delay={200 + index * 80}
//                     duration={400}
//                     useNativeDriver
//                     style={globalStyles.outfitCard}>
//                     <TouchableOpacity
//                       activeOpacity={0.85}
//                       onPress={() => {
//                         ReactNativeHapticFeedback.trigger('impactMedium');
//                         handleShopModal([vibe.query_used]);
//                       }}>
//                       <AppleTouchFeedback
//                         hapticStyle="impactMedium"
//                         onPress={() => {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           handleShopModal([vibe.query_used]);
//                         }}
//                         style={{alignItems: 'center'}}>
//                         <Image
//                           source={{uri: vibe.image_url}}
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
//                         {/* 👇 Add share button */}
//                         <TouchableOpacity
//                           onPress={() => handleShareVibe(vibe)}
//                           style={{
//                             position: 'absolute',
//                             top: 6,
//                             right: 6,
//                             backgroundColor: 'rgba(0,0,0,0.4)',
//                             borderRadius: 20,
//                             padding: 6,
//                           }}>
//                           <Icon name="ios-share" size={20} color="#fff" />
//                         </TouchableOpacity>
//                       </AppleTouchFeedback>

//                       <Text
//                         numberOfLines={1}
//                         style={[
//                           globalStyles.subLabel,
//                           {marginTop: 6, textAlign: 'center'},
//                         ]}>
//                         {vibe.query_used?.split(' ').slice(0, 3).join(' ') ||
//                           'Recent'}
//                       </Text>
//                     </TouchableOpacity>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             </Animatable.View>
//           </CollapsibleSection>
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
//         <AllSavedLooksModal
//           visible={imageModalVisible}
//           onClose={() => setImageModalVisible(false)}
//           savedLooks={savedLooks}
//           recreateLook={handleRecreateLook}
//           openShopModal={handleShopModal}
//           shopResults={shopResults}
//           openPersonalizedShopModal={openPersonalizedShopModal} // ✅ add this
//         />
//         <ShopModal
//           visible={shopVisible}
//           onClose={() => setShopVisible(false)}
//           results={shopResults}
//         />
//         {/* <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={personalizedPurchases}
//         /> */}
//         <PersonalizedShopModal
//           visible={personalizedVisible}
//           onClose={() => setPersonalizedVisible(false)}
//           purchases={
//             personalizedPurchases?.purchases ??
//             personalizedPurchases?.suggested_purchases ??
//             []
//           }
//           recreatedOutfit={
//             personalizedPurchases?.recreatedOutfit ??
//             personalizedPurchases?.recreated_outfit ??
//             []
//           }
//           styleNote={
//             personalizedPurchases?.styleNote ??
//             personalizedPurchases?.style_note ??
//             ''
//           }
//         />

//         {showRecreatedModal && recreatedData && (
//           <Modal
//             visible={showRecreatedModal}
//             animationType="slide"
//             transparent={false}
//             presentationStyle="fullScreen"
//             statusBarTranslucent
//             onRequestClose={() => setShowRecreatedModal(false)}>
//             <RecreatedLookScreen
//               route={{params: {data: recreatedData}}}
//               navigation={{goBack: () => setShowRecreatedModal(false)}}
//             />
//           </Modal>
//         )}
//       </Animated.ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;
