import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {API_BASE_URL} from '../../config/api';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import SwipeableCard from '../../components/SwipeableCard/SwipeableCard';

type Props = {
  weather: any;
  navigate: (screen: string, params?: any) => void;
  userName?: string;
  wardrobe?: any[];
  preferences?: any;
};

export type AiSuggestionResponse = {
  suggestion: string;
  insight?: string;
  tomorrow?: string;
  seasonalForecast?: string;
  lifecycleForecast?: string;
  styleTrajectory?: string;
};

// 🕐 Cooldown windows
const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
const STORAGE_KEY = 'aiStylistAutoMode';

const AiStylistSuggestions: React.FC<Props> = ({
  weather,
  navigate,
  userName = 'You',
  wardrobe = [],
  preferences = {},
}) => {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(false);

  const lastSuggestionRef = useRef<string | null>(null);
  const lastNotifyTimeRef = useRef<number>(0);
  const lastFetchTimeRef = useRef<number>(0);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isExpanded, setIsExpanded] = useState(true);
  const toggleExpanded = () => setIsExpanded(prev => !prev);

  /** 🧠 Fetch AI suggestion */
  const fetchSuggestion = async (trigger: string = 'manual') => {
    if (!weather?.fahrenheit?.main?.temp) {
      console.log('⏸️ Weather not ready, skipping AI fetch.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {user: userName, weather, wardrobe, preferences};
      console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

      const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to fetch suggestion');
      const data: AiSuggestionResponse = await res.json();
      console.log('✅ AI suggestion data:', data);
      setAiData(data);

      const now = Date.now();
      const significantChange =
        lastSuggestionRef.current &&
        data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

      if (
        significantChange &&
        now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
      ) {
        PushNotification.localNotification({
          title: '✨ New Style Suggestion Ready',
          message: data.suggestion,
          channelId: 'ai-suggestions',
        });
        lastNotifyTimeRef.current = now;
      }

      lastSuggestionRef.current = data.suggestion;
      lastFetchTimeRef.current = now;
    } catch (err) {
      console.error(err);
      setError('Unable to load AI suggestions right now.');
    } finally {
      setLoading(false);
    }
  };

  /** 📍 Fallback suggestion */
  const fallbackSuggestion = () => {
    const temp = weather?.fahrenheit?.main?.temp;
    const condition = weather?.celsius?.weather?.[0]?.main;

    if (!temp)
      return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

    let base = '';
    if (temp < 40)
      base =
        'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
    else if (temp < 50)
      base =
        'Chilly — add mid-weight layers like knitwear or light outer layers.';
    else if (temp < 65)
      base =
        'Mild — lightweight layers and versatile pieces will keep you ready.';
    else if (temp < 80)
      base =
        'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
    else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
    else
      base =
        'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

    let extra = '';
    if (condition === 'Rain')
      extra = ' ☔ Waterproof layers will keep you dry.';
    if (condition === 'Snow')
      extra = ' ❄️ Choose insulated footwear and outerwear.';
    if (condition === 'Clear')
      extra = ' 😎 Sunglasses add both comfort and style.';
    if (condition === 'Clouds')
      extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

    return `${base}${extra}`;
  };

  /** 📊 Load saved auto-mode preference */
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === null) {
          setIsAutoMode(false);
          await AsyncStorage.setItem(STORAGE_KEY, 'false');
        } else {
          setIsAutoMode(saved === 'true');
        }
      } catch (e) {
        console.warn('⚠️ Failed to load auto mode setting', e);
        setIsAutoMode(false);
      }
    })();
  }, []);

  /** 💾 Save auto-mode preference */
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
      console.warn('⚠️ Failed to save auto mode setting', e),
    );
  }, [isAutoMode]);

  /** 📡 Auto-fetch on mount if auto mode */
  useEffect(() => {
    if (isAutoMode) {
      const now = Date.now();
      const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;
      if (!aiData || cooldownPassed) {
        fetchSuggestion('initial');
        lastFetchTimeRef.current = now;
      }
    }
  }, [isAutoMode]);

  /** 🔁 Auto-refresh every 4h */
  useEffect(() => {
    if (isAutoMode) {
      refreshTimerRef.current = setInterval(() => {
        fetchSuggestion('scheduled');
      }, NOTIFICATION_COOLDOWN_MS);
    }
    return () =>
      refreshTimerRef.current && clearInterval(refreshTimerRef.current);
  }, [isAutoMode]);

  /** 🔄 Refresh when app resumes */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (isAutoMode && state === 'active') {
        const now = Date.now();
        if (now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS) {
          fetchSuggestion('resume');
          lastFetchTimeRef.current = now;
        }
      }
    });
    return () => subscription.remove();
  }, [isAutoMode]);

  return (
    <Animatable.View
      animation="fadeInUp"
      delay={200}
      duration={700}
      useNativeDriver
      style={{
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: theme.colors.surface,
        borderRadius: tokens.borderRadius.md,
        borderWidth: theme.borderWidth.md,
        borderColor: theme.colors.surfaceBorder,
        padding: 18,
      }}>
      {/* 🧠 Header */}
      <View
        style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
        <Icon
          name="stars"
          size={22}
          color={theme.colors.button1}
          style={{marginRight: 8}}
        />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: theme.colors.foreground,
            textTransform: 'uppercase',
          }}>
          AI Style Suggestions
        </Text>
      </View>

      {/* 🧠 Manual / Auto Switch */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}>
        <Text
          style={{color: theme.colors.foreground2, fontSize: 14, marginTop: 4}}>
          Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
        </Text>
        <Switch
          value={isAutoMode}
          onValueChange={setIsAutoMode}
          trackColor={{false: '#555', true: theme.colors.button1}}
          thumbColor={isAutoMode ? '#fff' : '#ccc'}
        />
      </View>

      {/* 💬 Suggestion Card (swipe zone) */}
      <SwipeableCard
        onSwipeLeft={() => fetchSuggestion('manual')}
        onSwipeRight={() =>
          navigate('Outfit', {
            from: 'AiStylistSuggestions',
            seedPrompt: aiData?.suggestion || fallbackSuggestion(),
            autogenerate: true,
          })
        }
        deleteThreshold={0.08}
        style={{
          backgroundColor: theme.colors.surface2,
          borderRadius: tokens.borderRadius.md,
          borderWidth: theme.borderWidth.md,
          borderColor: theme.colors.surfaceBorder,
          padding: 12,
        }}>
        {loading && (
          <ActivityIndicator
            color={theme.colors.button1}
            style={{marginVertical: 20}}
          />
        )}

        {!loading && (
          <>
            <Animatable.View
              transition="maxHeight"
              duration={400}
              style={{
                overflow: 'hidden',
                maxHeight: isExpanded ? 1000 : 150, // 👈 show only ~2 lines collapsed
              }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: theme.colors.foreground,
                  lineHeight: 22,
                  marginBottom: 16,
                  paddingHorizontal: 6,
                }}>
                {error
                  ? fallbackSuggestion()
                  : aiData?.suggestion || fallbackSuggestion()}
              </Text>

              {aiData?.insight && (
                <Animatable.Text
                  animation="fadeIn"
                  delay={300}
                  style={{
                    fontSize: 15,
                    color: theme.colors.foreground2,
                    fontStyle: 'italic',
                    marginBottom: 14,
                    lineHeight: 20,
                    marginHorizontal: 16,
                  }}>
                  💡 {aiData.insight}
                </Animatable.Text>
              )}

              {aiData?.tomorrow && (
                <Animatable.Text
                  animation="fadeInUp"
                  delay={400}
                  style={{
                    fontSize: 15,
                    color: theme.colors.foreground2,
                    marginBottom: 18,
                    lineHeight: 20,
                    marginHorizontal: 16,
                  }}>
                  📆 Tomorrow: {aiData.tomorrow}
                </Animatable.Text>
              )}

              {aiData?.seasonalForecast && (
                <Animatable.Text
                  animation="fadeInUp"
                  delay={500}
                  style={{
                    fontSize: 15,
                    color: theme.colors.foreground2,
                    marginBottom: 18,
                    lineHeight: 20,
                    marginHorizontal: 16,
                  }}>
                  🍂 {aiData.seasonalForecast}
                </Animatable.Text>
              )}

              {aiData?.lifecycleForecast && (
                <Animatable.Text
                  animation="fadeInUp"
                  delay={600}
                  style={{
                    fontSize: 15,
                    color: theme.colors.foreground2,
                    marginBottom: 18,
                    lineHeight: 20,
                    marginHorizontal: 16,
                  }}>
                  ⏳ {aiData.lifecycleForecast}
                </Animatable.Text>
              )}

              {aiData?.styleTrajectory && (
                <Animatable.Text
                  animation="fadeInUp"
                  delay={700}
                  style={{
                    fontSize: 15,
                    color: theme.colors.foreground2,
                    marginBottom: 18,
                    lineHeight: 20,
                    marginHorizontal: 16,
                  }}>
                  📊 {aiData.styleTrajectory}
                </Animatable.Text>
              )}
            </Animatable.View>

            {/* 👇 Collapse / Expand toggle */}
            <TouchableOpacity
              onPress={toggleExpanded}
              activeOpacity={0.8}
              style={{
                alignItems: 'center',
                paddingVertical: 10,
                flexDirection: 'row',
                justifyContent: 'center',
              }}>
              <Text
                style={{
                  color: theme.colors.button1,
                  fontWeight: '600',
                  fontSize: 15,
                  marginRight: 6,
                }}>
                {isExpanded ? 'Show Less' : 'Show More'}
              </Text>
              <Animatable.View
                duration={250}
                style={{
                  transform: [{rotate: isExpanded ? '180deg' : '0deg'}],
                }}>
                <Icon
                  name="expand-more"
                  size={24}
                  color={theme.colors.button1}
                />
              </Animatable.View>
            </TouchableOpacity>
          </>
        )}
      </SwipeableCard>

      {/* 🔁 Buttons */}
      {/* <View style={{alignItems: 'center', marginTop: 20}}>
        <AppleTouchFeedback
          hapticStyle="impactHeavy"
          style={[
            globalStyles.buttonPrimary,
            {paddingVertical: 13, marginBottom: 14, width: 230},
          ]}
          onPress={() => fetchSuggestion('manual')}>
          <Text style={globalStyles.buttonPrimaryText}>Refresh Suggestion</Text>
        </AppleTouchFeedback>

        {aiData && (
          <AppleTouchFeedback
            hapticStyle="impactHeavy"
            style={[
              globalStyles.buttonPrimary,
              {paddingVertical: 13, marginBottom: 12, marginTop: 6, width: 230},
            ]}
            onPress={() =>
              navigate('Outfit', {
                from: 'AiStylistSuggestions',
                seedPrompt: aiData?.suggestion || fallbackSuggestion(),
                autogenerate: true,
              })
            }>
            <Text style={globalStyles.buttonPrimaryText}>
              Generate Full Look
            </Text>
          </AppleTouchFeedback>
        )}
      </View> */}

      {/* 🔁 Secondary CTAs */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 14,
        }}>
        <TouchableOpacity onPress={() => navigate('Wardrobe')}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: theme.colors.button1,
              // textDecorationLine: 'underline',
            }}>
            View Wardrobe Gaps
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: theme.colors.button1,
              // textDecorationLine: 'underline',
            }}>
            Ask a Styling Question
          </Text>
        </TouchableOpacity>
      </View>

      {/* 🧭 Subtle swipe hint */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: 20,
          opacity: 0.6,
          marginRight: 20,
        }}>
        <Icon
          name="chevron-left"
          size={35}
          color={theme.colors.foreground}
          style={{marginTop: -7.5}}
        />
        <Text
          style={{
            color: theme.colors.foreground,
            fontSize: 16,
          }}>
          Swipe suggestion left for new result
        </Text>
        {/* <Text style={{color: theme.colors.foreground, fontSize: 13}}>
          Swipe right to create outfit
        </Text> */}
      </View>
    </Animatable.View>
  );
};

export default AiStylistSuggestions;

//////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import SwipeableCard from '../../components/SwipeableCard/SwipeableCard';

// type Props = {
//   weather: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
//   seasonalForecast?: string;
//   lifecycleForecast?: string;
//   styleTrajectory?: string;
// };

// // 🕐 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   weather,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false);

//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error('Failed to fetch suggestion');
//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 📊 Load saved auto-mode preference */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);
//         if (saved === null) {
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Save auto-mode preference */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch on mount if auto mode */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;
//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       }
//     }
//   }, [isAutoMode]);

//   /** 🔁 Auto-refresh every 4h */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () =>
//       refreshTimerRef.current && clearInterval(refreshTimerRef.current);
//   }, [isAutoMode]);

//   /** 🔄 Refresh when app resumes */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         if (now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS) {
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 20,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//           }}>
//           AI Style Suggestions
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 14,
//         }}>
//         <Text
//           style={{color: theme.colors.foreground2, fontSize: 14, marginTop: 4}}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion Card (swipe zone) */}
//       <SwipeableCard
//         onSwipeLeft={() => fetchSuggestion('manual')}
//         onSwipeRight={() =>
//           navigate('Outfit', {
//             from: 'AiStylistSuggestions',
//             seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//             autogenerate: true,
//           })
//         }
//         deleteThreshold={0.08} // 🔥 <-- ADD THIS LINE (lower threshold = lighter swipe)
//         style={{
//           backgroundColor: theme.colors.surface2,
//           borderRadius: tokens.borderRadius.md,
//           padding: 12,
//         }}>
//         {loading && (
//           <ActivityIndicator
//             color={theme.colors.button1}
//             style={{marginVertical: 20}}
//           />
//         )}

//         {!loading && (
//           <>
//             <Text
//               style={{
//                 fontSize: 15,
//                 fontWeight: '600',
//                 color: theme.colors.foreground,
//                 lineHeight: 22,
//                 marginBottom: 16,
//                 paddingHorizontal: 6,
//               }}>
//               {error
//                 ? fallbackSuggestion()
//                 : aiData?.suggestion || fallbackSuggestion()}
//             </Text>

//             {aiData?.insight && (
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={300}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   fontStyle: 'italic',
//                   marginBottom: 14,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 💡 {aiData.insight}
//               </Animatable.Text>
//             )}

//             {aiData?.tomorrow && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={400}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📆 Tomorrow: {aiData.tomorrow}
//               </Animatable.Text>
//             )}

//             {aiData?.seasonalForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={500}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 🍂 {aiData.seasonalForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.lifecycleForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={600}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 ⏳ {aiData.lifecycleForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.styleTrajectory && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={700}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📊 {aiData.styleTrajectory}
//               </Animatable.Text>
//             )}
//           </>
//         )}
//       </SwipeableCard>

//       {/* 🔁 Buttons */}
//       {/* <View style={{alignItems: 'center', marginTop: 20}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 14, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text style={globalStyles.buttonPrimaryText}>Refresh Suggestion</Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, marginTop: 6, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View> */}

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 14,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               // textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               // textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* 🧭 Subtle swipe hint */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'center',
//           marginTop: 20,
//           opacity: 0.6,
//           marginRight: 20,
//         }}>
//         <Icon
//           name="chevron-left"
//           size={35}
//           color={theme.colors.foreground}
//           style={{marginTop: -7.5}}
//         />
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             fontSize: 16,
//           }}>
//           Swipe suggestion left for new result
//         </Text>
//         {/* <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//           Swipe right to create outfit
//         </Text> */}
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

/////////////////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import SwipeableCard from '../../components/SwipeableCard/SwipeableCard';

// type Props = {
//   weather: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
//   seasonalForecast?: string;
//   lifecycleForecast?: string;
//   styleTrajectory?: string;
// };

// // 🕐 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   weather,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false);

//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error('Failed to fetch suggestion');
//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 📊 Load saved auto-mode preference */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);
//         if (saved === null) {
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Save auto-mode preference */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch on mount if auto mode */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;
//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       }
//     }
//   }, [isAutoMode]);

//   /** 🔁 Auto-refresh every 4h */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () =>
//       refreshTimerRef.current && clearInterval(refreshTimerRef.current);
//   }, [isAutoMode]);

//   /** 🔄 Refresh when app resumes */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         if (now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS) {
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 20,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//           }}>
//           AI Style Suggestions
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 14,
//         }}>
//         <Text
//           style={{color: theme.colors.foreground2, fontSize: 14, marginTop: 4}}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion Card (swipe zone) */}
//       <SwipeableCard
//         onSwipeLeft={() => fetchSuggestion('manual')}
//         onSwipeRight={() =>
//           navigate('Outfit', {
//             from: 'AiStylistSuggestions',
//             seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//             autogenerate: true,
//           })
//         }
//         deleteThreshold={0.08} // 🔥 <-- ADD THIS LINE (lower threshold = lighter swipe)
//         style={{
//           backgroundColor: theme.colors.surface2,
//           borderRadius: tokens.borderRadius.md,
//           padding: 12,
//         }}>
//         {loading && (
//           <ActivityIndicator
//             color={theme.colors.button1}
//             style={{marginVertical: 20}}
//           />
//         )}

//         {!loading && (
//           <>
//             <Text
//               style={{
//                 fontSize: 15,
//                 fontWeight: '600',
//                 color: theme.colors.foreground,
//                 lineHeight: 22,
//                 marginBottom: 16,
//                 paddingHorizontal: 6,
//               }}>
//               {error
//                 ? fallbackSuggestion()
//                 : aiData?.suggestion || fallbackSuggestion()}
//             </Text>

//             {aiData?.insight && (
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={300}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   fontStyle: 'italic',
//                   marginBottom: 14,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 💡 {aiData.insight}
//               </Animatable.Text>
//             )}

//             {aiData?.tomorrow && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={400}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📆 Tomorrow: {aiData.tomorrow}
//               </Animatable.Text>
//             )}

//             {aiData?.seasonalForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={500}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 🍂 {aiData.seasonalForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.lifecycleForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={600}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 ⏳ {aiData.lifecycleForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.styleTrajectory && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={700}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📊 {aiData.styleTrajectory}
//               </Animatable.Text>
//             )}
//           </>
//         )}
//       </SwipeableCard>

//       {/* 🔁 Buttons */}
//       {/* <View style={{alignItems: 'center', marginTop: 20}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 14, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text style={globalStyles.buttonPrimaryText}>Refresh Suggestion</Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, marginTop: 6, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View> */}

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 14,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               // textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               // textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* 🧭 Subtle swipe hint */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'center',
//           marginTop: 20,
//           opacity: 0.6,
//         }}>
//         <Icon
//           name="chevron-left"
//           size={35}
//           color={theme.colors.foreground}
//           style={{marginTop: -7.5}}
//         />
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             fontSize: 16,
//           }}>
//           Swipe suggestion left for new result
//         </Text>
//         {/* <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//           Swipe right to create outfit
//         </Text> */}
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

////////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import SwipeableCard from '../../components/SwipeableCard/SwipeableCard';

// type Props = {
//   weather: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
//   seasonalForecast?: string;
//   lifecycleForecast?: string;
//   styleTrajectory?: string;
// };

// // 🕐 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   weather,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false);

//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error('Failed to fetch suggestion');
//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 📊 Load saved auto-mode preference */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);
//         if (saved === null) {
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Save auto-mode preference */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch on mount if auto mode */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;
//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       }
//     }
//   }, [isAutoMode]);

//   /** 🔁 Auto-refresh every 4h */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () =>
//       refreshTimerRef.current && clearInterval(refreshTimerRef.current);
//   }, [isAutoMode]);

//   /** 🔄 Refresh when app resumes */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         if (now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS) {
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 20,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//           }}>
//           AI Style Suggestions
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 14,
//         }}>
//         <Text style={{color: theme.colors.foreground2, fontSize: 14}}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion Card (swipe zone) */}
//       <SwipeableCard
//         onSwipeLeft={() => fetchSuggestion('manual')}
//         onSwipeRight={() =>
//           navigate('Outfit', {
//             from: 'AiStylistSuggestions',
//             seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//             autogenerate: true,
//           })
//         }
//         style={{
//           backgroundColor: theme.colors.surface2,
//           borderRadius: tokens.borderRadius.md,
//           padding: 12,
//         }}>
//         {loading && (
//           <ActivityIndicator
//             color={theme.colors.button1}
//             style={{marginVertical: 20}}
//           />
//         )}

//         {!loading && (
//           <>
//             <Text
//               style={{
//                 fontSize: 14,
//                 fontWeight: '500',
//                 color: theme.colors.foreground,
//                 lineHeight: 22,
//                 marginBottom: 16,
//                 paddingHorizontal: 6,
//               }}>
//               {error
//                 ? fallbackSuggestion()
//                 : aiData?.suggestion || fallbackSuggestion()}
//             </Text>

//             {aiData?.insight && (
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={300}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   fontStyle: 'italic',
//                   marginBottom: 14,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 💡 {aiData.insight}
//               </Animatable.Text>
//             )}

//             {aiData?.tomorrow && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={400}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📆 Tomorrow: {aiData.tomorrow}
//               </Animatable.Text>
//             )}

//             {aiData?.seasonalForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={500}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 🍂 {aiData.seasonalForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.lifecycleForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={600}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 ⏳ {aiData.lifecycleForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.styleTrajectory && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={700}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📊 {aiData.styleTrajectory}
//               </Animatable.Text>
//             )}
//           </>
//         )}
//       </SwipeableCard>

//       {/* 🔁 Buttons */}
//       {/* <View style={{alignItems: 'center', marginTop: 20}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 14, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text style={globalStyles.buttonPrimaryText}>Refresh Suggestion</Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, marginTop: 6, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View> */}

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* 🧭 Subtle swipe hint */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'center',
//           marginTop: 20,
//           opacity: 0.6,
//         }}>
//         <Icon
//           name="chevron-left"
//           size={35}
//           color={theme.colors.foreground}
//           style={{marginTop: -7.5}}
//         />
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             fontSize: 16,
//           }}>
//           Swipe suggestion left for new result
//         </Text>
//         {/* <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//           Swipe right to create outfit
//         </Text> */}
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

////////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import SwipeableCard from '../../components/SwipeableCard/SwipeableCard';

// type Props = {
//   weather: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
//   seasonalForecast?: string;
//   lifecycleForecast?: string;
//   styleTrajectory?: string;
// };

// // 🕐 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   weather,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false);

//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error('Failed to fetch suggestion');
//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 📊 Load saved auto-mode preference */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);
//         if (saved === null) {
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Save auto-mode preference */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch on mount if auto mode */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;
//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       }
//     }
//   }, [isAutoMode]);

//   /** 🔁 Auto-refresh every 4h */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () =>
//       refreshTimerRef.current && clearInterval(refreshTimerRef.current);
//   }, [isAutoMode]);

//   /** 🔄 Refresh when app resumes */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         if (now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS) {
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 20,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//           }}>
//           AI Style Suggestions
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 14,
//         }}>
//         <Text style={{color: theme.colors.foreground2, fontSize: 14}}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion Card (swipe zone) */}
//       <SwipeableCard
//         onSwipeLeft={() => fetchSuggestion('manual')}
//         onSwipeRight={() =>
//           navigate('Outfit', {
//             from: 'AiStylistSuggestions',
//             seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//             autogenerate: true,
//           })
//         }
//         style={{
//           backgroundColor: theme.colors.surface2,
//           borderRadius: tokens.borderRadius.md,
//           padding: 12,
//         }}>
//         {loading && (
//           <ActivityIndicator
//             color={theme.colors.button1}
//             style={{marginVertical: 20}}
//           />
//         )}

//         {!loading && (
//           <>
//             <Text
//               style={{
//                 fontSize: 14,
//                 fontWeight: '500',
//                 color: theme.colors.foreground,
//                 lineHeight: 22,
//                 marginBottom: 16,
//                 paddingHorizontal: 6,
//               }}>
//               {error
//                 ? fallbackSuggestion()
//                 : aiData?.suggestion || fallbackSuggestion()}
//             </Text>

//             {aiData?.insight && (
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={300}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   fontStyle: 'italic',
//                   marginBottom: 14,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 💡 {aiData.insight}
//               </Animatable.Text>
//             )}

//             {aiData?.tomorrow && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={400}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📆 Tomorrow: {aiData.tomorrow}
//               </Animatable.Text>
//             )}

//             {aiData?.seasonalForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={500}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 🍂 {aiData.seasonalForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.lifecycleForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={600}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 ⏳ {aiData.lifecycleForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.styleTrajectory && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={700}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📊 {aiData.styleTrajectory}
//               </Animatable.Text>
//             )}
//           </>
//         )}
//       </SwipeableCard>

//       {/* 🔁 Buttons */}
//       {/* <View style={{alignItems: 'center', marginTop: 20}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 14, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text style={globalStyles.buttonPrimaryText}>Refresh Suggestion</Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, marginTop: 6, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View> */}

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* 🧭 Subtle swipe hint */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'center',
//           marginTop: 20,
//           opacity: 0.6,
//         }}>
//         <Icon
//           name="chevron-left"
//           size={35}
//           color={theme.colors.foreground}
//           style={{marginTop: -7.5}}
//         />
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             fontSize: 16,
//           }}>
//           Swipe suggestion left for new result
//         </Text>
//         {/* <Text style={{color: theme.colors.foreground, fontSize: 13}}>
//           Swipe right to create outfit
//         </Text> */}
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

///////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
//   Animated,
//   PanResponder,
//   Dimensions,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import SwipeableCard from '../../components/SwipeableCard/SwipeableCard';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
//   seasonalForecast?: string;
//   lifecycleForecast?: string;
//   styleTrajectory?: string;
// };

// // 🔁 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   weather,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false);

//   // 📊 Memory refs
//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       // 🧠 Notify only if significant change
//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 🗂️ Load persisted toggle — default to manual if not set */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);

//         if (saved === null) {
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Persist toggle change */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch once on mount (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       } else {
//         console.log('⏸️ Skipping AI fetch — cooldown not reached');
//       }
//     }
//   }, [isAutoMode]);

//   /** 🔁 Refresh every 4 hours (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, [isAutoMode]);

//   /** 📱 Refresh on resume (if auto mode) */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         const cooldownPassed =
//           now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//         if (cooldownPassed) {
//           console.log('📱 App resumed — refreshing AI suggestion');
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 20,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 0}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 0,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 14,
//         }}>
//         <Text
//           style={{
//             color: theme.colors.foreground2,
//             fontSize: 14,
//             fontWeight: '400',
//             marginTop: 8,
//           }}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion Card (swipe zone) */}

//       <SwipeableCard
//         onSwipeLeft={() => fetchSuggestion('manual')}
//         onSwipeRight={() =>
//           navigate('Outfit', {
//             from: 'AiStylistSuggestions',
//             seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//             autogenerate: true,
//           })
//         }
//         style={{
//           backgroundColor: theme.colors.surface2,
//           borderRadius: tokens.borderRadius.md,
//           padding: 12,
//         }}>
//         {loading && (
//           <ActivityIndicator
//             color={theme.colors.button1}
//             style={{marginVertical: 20}}
//           />
//         )}

//         {!loading && (
//           <>
//             <Text
//               style={{
//                 fontSize: 14,
//                 fontWeight: '500',
//                 color: theme.colors.foreground,
//                 lineHeight: 22,
//                 marginBottom: 16,
//                 paddingHorizontal: 6,
//               }}>
//               {error
//                 ? fallbackSuggestion()
//                 : aiData?.suggestion || fallbackSuggestion()}
//             </Text>

//             {aiData?.insight && (
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={300}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   fontStyle: 'italic',
//                   marginBottom: 14,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 💡 {aiData.insight}
//               </Animatable.Text>
//             )}

//             {aiData?.tomorrow && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={400}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📆 Tomorrow: {aiData.tomorrow}
//               </Animatable.Text>
//             )}

//             {aiData?.seasonalForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={500}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 🍂 {aiData.seasonalForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.lifecycleForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={600}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 ⏳ {aiData.lifecycleForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.styleTrajectory && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={700}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📊 {aiData.styleTrajectory}
//               </Animatable.Text>
//             )}
//           </>
//         )}
//       </SwipeableCard>

//       {/* 🔁 Buttons */}
//       <View style={{alignItems: 'center', marginTop: 20}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 14, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: tokens.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {
//                 paddingVertical: 13,
//                 marginBottom: 12,
//                 marginTop: 6,
//                 width: 230,
//               },
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* 🧭 Swipe hints */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 20,
//           opacity: 0.6,
//         }}>
//         <Text style={{color: theme.colors.foreground2, fontSize: 13}}>
//           👈 Swipe left for new suggestion
//         </Text>
//         <Text style={{color: theme.colors.foreground2, fontSize: 13}}>
//           👉 Swipe right to save
//         </Text>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

/////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
//   Animated,
//   PanResponder,
//   Dimensions,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import SwipeableCard from '../../components/SwipeableCard/SwipeableCard';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
//   seasonalForecast?: string;
//   lifecycleForecast?: string;
//   styleTrajectory?: string;
// };

// // 🔁 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   weather,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false);

//   // 📊 Memory refs
//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       // 🧠 Notify only if significant change
//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 🗂️ Load persisted toggle — default to manual if not set */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);

//         if (saved === null) {
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Persist toggle change */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch once on mount (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       } else {
//         console.log('⏸️ Skipping AI fetch — cooldown not reached');
//       }
//     }
//   }, [isAutoMode]);

//   /** 🔁 Refresh every 4 hours (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, [isAutoMode]);

//   /** 📱 Refresh on resume (if auto mode) */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         const cooldownPassed =
//           now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//         if (cooldownPassed) {
//           console.log('📱 App resumed — refreshing AI suggestion');
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 20,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 0}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 0,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 14,
//         }}>
//         <Text
//           style={{
//             color: theme.colors.foreground2,
//             fontSize: 14,
//             fontWeight: '400',
//             marginTop: 8,
//           }}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion Card (swipe zone) */}

//       <SwipeableCard
//         onSwipeLeft={() => fetchSuggestion('manual')}
//         onSwipeRight={() =>
//           navigate('Outfit', {
//             from: 'AiStylistSuggestions',
//             seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//             autogenerate: true,
//           })
//         }
//         style={{
//           backgroundColor: theme.colors.surface2,
//           borderRadius: tokens.borderRadius.md,
//           padding: 12,
//         }}>
//         {loading && (
//           <ActivityIndicator
//             color={theme.colors.button1}
//             style={{marginVertical: 20}}
//           />
//         )}

//         {!loading && (
//           <>
//             <Text
//               style={{
//                 fontSize: 14,
//                 fontWeight: '500',
//                 color: theme.colors.foreground,
//                 lineHeight: 22,
//                 marginBottom: 16,
//                 paddingHorizontal: 6,
//               }}>
//               {error
//                 ? fallbackSuggestion()
//                 : aiData?.suggestion || fallbackSuggestion()}
//             </Text>

//             {aiData?.insight && (
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={300}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   fontStyle: 'italic',
//                   marginBottom: 14,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 💡 {aiData.insight}
//               </Animatable.Text>
//             )}

//             {aiData?.tomorrow && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={400}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📆 Tomorrow: {aiData.tomorrow}
//               </Animatable.Text>
//             )}

//             {aiData?.seasonalForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={500}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 🍂 {aiData.seasonalForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.lifecycleForecast && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={600}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 ⏳ {aiData.lifecycleForecast}
//               </Animatable.Text>
//             )}

//             {aiData?.styleTrajectory && (
//               <Animatable.Text
//                 animation="fadeInUp"
//                 delay={700}
//                 style={{
//                   fontSize: 15,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                   lineHeight: 20,
//                   marginHorizontal: 16,
//                 }}>
//                 📊 {aiData.styleTrajectory}
//               </Animatable.Text>
//             )}
//           </>
//         )}
//       </SwipeableCard>

//       {/* 🔁 Buttons */}
//       <View style={{alignItems: 'center', marginTop: 20}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 14, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: tokens.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {
//                 paddingVertical: 13,
//                 marginBottom: 12,
//                 marginTop: 6,
//                 width: 230,
//               },
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* 🧭 Swipe hints */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 20,
//           opacity: 0.6,
//         }}>
//         <Text style={{color: theme.colors.foreground2, fontSize: 13}}>
//           👈 Swipe left for new suggestion
//         </Text>
//         <Text style={{color: theme.colors.foreground2, fontSize: 13}}>
//           👉 Swipe right to save
//         </Text>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
//   Animated,
//   PanResponder,
//   Dimensions,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
//   seasonalForecast?: string;
//   lifecycleForecast?: string;
//   styleTrajectory?: string;
// };

// // 🔁 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const SCREEN_WIDTH = Dimensions.get('window').width;

// const AiStylistSuggestions: React.FC<Props> = ({
//   weather,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false);

//   // 📊 Memory refs
//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   // 🪄 Gesture + haptics setup (drop-in replacement)
//   const panX = useRef(new Animated.Value(0)).current;
//   const SWIPE_DISMISS = Math.min(140, SCREEN_WIDTH * 0.28);

//   const panResponder = useRef(
//     PanResponder.create({
//       // only start if it's a real horizontal swipe (prevents vertical scroll conflict)
//       onMoveShouldSetPanResponder: (_evt, g) =>
//         Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
//       onMoveShouldSetPanResponderCapture: (_evt, g) =>
//         Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),

//       // once we've claimed it, don't let scroll steal it mid-gesture
//       onPanResponderTerminationRequest: () => false,

//       onPanResponderMove: (_evt, g) => {
//         // small clamp feels nicer
//         const nextX = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, g.dx));
//         panX.setValue(nextX);
//       },

//       onPanResponderRelease: (_evt, g) => {
//         if (g.dx > SWIPE_DISMISS) {
//           // 👉 approve → generate look
//           triggerHaptic('impactLight');
//           Animated.timing(panX, {
//             toValue: SCREEN_WIDTH + 40,
//             duration: 200,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             if (aiData?.suggestion) {
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData.suggestion,
//                 autogenerate: true,
//               });
//             }
//           });
//         } else if (g.dx < -SWIPE_DISMISS) {
//           // 👈 reject → fetch new suggestion
//           triggerHaptic('impactLight');
//           Animated.timing(panX, {
//             toValue: -SCREEN_WIDTH - 40,
//             duration: 200,
//             useNativeDriver: true,
//           }).start(() => {
//             panX.setValue(0);
//             fetchSuggestion('manual'); // same function as you asked
//           });
//         } else {
//           // not far enough → snap back smoothly
//           Animated.spring(panX, {
//             toValue: 0,
//             useNativeDriver: true,
//             bounciness: 8,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         // if something interrupts, snap back
//         Animated.spring(panX, {toValue: 0, useNativeDriver: true}).start();
//       },
//     }),
//   ).current;

//   // nice subtle fade while swiping
//   const cardAnimatedStyle = {
//     transform: [{translateX: panX}],
//     opacity: panX.interpolate({
//       inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
//       outputRange: [0.5, 1, 0.5],
//     }),
//   };
//   const triggerHaptic = (type = 'impactMedium') => {
//     ReactNativeHapticFeedback.trigger(type, {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       // 🧠 Notify only if significant change
//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 🗂️ Load persisted toggle — default to manual if not set */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);

//         if (saved === null) {
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Persist toggle change */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch once on mount (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       } else {
//         console.log('⏸️ Skipping AI fetch — cooldown not reached');
//       }
//     }
//   }, [isAutoMode]);

//   /** 🔁 Refresh every 4 hours (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, [isAutoMode]);

//   /** 📱 Refresh on resume (if auto mode) */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         const cooldownPassed =
//           now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//         if (cooldownPassed) {
//           console.log('📱 App resumed — refreshing AI suggestion');
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 20,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 0}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 0,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 14,
//         }}>
//         <Text
//           style={{
//             color: theme.colors.foreground2,
//             fontSize: 14,
//             fontWeight: '400',
//             marginTop: 8,
//           }}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion Card (swipe zone) */}
//       <View pointerEvents="box-none">
//         <Animated.View
//           {...panResponder.panHandlers}
//           style={[
//             {
//               backgroundColor: theme.colors.surface2,
//               borderRadius: tokens.borderRadius.md,
//               padding: 12,
//             },
//             cardAnimatedStyle, // ✅ key: translateX + fade
//           ]}>
//           {loading && (
//             <ActivityIndicator
//               color={theme.colors.button1}
//               style={{marginVertical: 20}}
//             />
//           )}

//           {!loading && (
//             <>
//               <Text
//                 style={{
//                   fontSize: 14,
//                   fontWeight: '500',
//                   color: theme.colors.foreground,
//                   lineHeight: 22,
//                   marginBottom: 16,
//                   paddingHorizontal: 6,
//                 }}>
//                 {error
//                   ? fallbackSuggestion()
//                   : aiData?.suggestion || fallbackSuggestion()}
//               </Text>

//               {aiData?.insight && (
//                 <Animatable.Text
//                   animation="fadeIn"
//                   delay={300}
//                   style={{
//                     fontSize: 15,
//                     color: theme.colors.foreground2,
//                     fontStyle: 'italic',
//                     marginBottom: 14,
//                     lineHeight: 20,
//                     marginHorizontal: 16,
//                   }}>
//                   💡 {aiData.insight}
//                 </Animatable.Text>
//               )}

//               {aiData?.tomorrow && (
//                 <Animatable.Text
//                   animation="fadeInUp"
//                   delay={400}
//                   style={{
//                     fontSize: 15,
//                     color: theme.colors.foreground2,
//                     marginBottom: 18,
//                     lineHeight: 20,
//                     marginHorizontal: 16,
//                   }}>
//                   📆 Tomorrow: {aiData.tomorrow}
//                 </Animatable.Text>
//               )}

//               {aiData?.seasonalForecast && (
//                 <Animatable.Text
//                   animation="fadeInUp"
//                   delay={500}
//                   style={{
//                     fontSize: 15,
//                     color: theme.colors.foreground2,
//                     marginBottom: 18,
//                     lineHeight: 20,
//                     marginHorizontal: 16,
//                   }}>
//                   🍂 {aiData.seasonalForecast}
//                 </Animatable.Text>
//               )}

//               {aiData?.lifecycleForecast && (
//                 <Animatable.Text
//                   animation="fadeInUp"
//                   delay={600}
//                   style={{
//                     fontSize: 15,
//                     color: theme.colors.foreground2,
//                     marginBottom: 18,
//                     lineHeight: 20,
//                     marginHorizontal: 16,
//                   }}>
//                   ⏳ {aiData.lifecycleForecast}
//                 </Animatable.Text>
//               )}

//               {aiData?.styleTrajectory && (
//                 <Animatable.Text
//                   animation="fadeInUp"
//                   delay={700}
//                   style={{
//                     fontSize: 15,
//                     color: theme.colors.foreground2,
//                     marginBottom: 18,
//                     lineHeight: 20,
//                     marginHorizontal: 16,
//                   }}>
//                   📊 {aiData.styleTrajectory}
//                 </Animatable.Text>
//               )}
//             </>
//           )}
//         </Animated.View>
//       </View>

//       {/* 🔁 Buttons */}
//       <View style={{alignItems: 'center', marginTop: 20}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 14, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: tokens.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {
//                 paddingVertical: 13,
//                 marginBottom: 12,
//                 marginTop: 6,
//                 width: 230,
//               },
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* 🧭 Swipe hints */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 20,
//           opacity: 0.6,
//         }}>
//         <Text style={{color: theme.colors.foreground2, fontSize: 13}}>
//           👈 Swipe left for new suggestion
//         </Text>
//         <Text style={{color: theme.colors.foreground2, fontSize: 13}}>
//           👉 Swipe right to save
//         </Text>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

//////////////////////////

// // src/components/AiStylistSuggestions/AiStylistSuggestions.tsx
// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
//   seasonalForecast?: string;
//   lifecycleForecast?: string;
//   styleTrajectory?: string;
// };

// // 🔁 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   weather,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false); // 🔥 persisted mode

//   // 📊 Memory refs
//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       // 🧠 Notify only if significant change
//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 🗂️ Load persisted toggle — default to manual if not set */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);

//         if (saved === null) {
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Persist toggle change */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch once on mount (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       } else {
//         console.log('⏸️ Skipping AI fetch — cooldown not reached');
//       }
//     }
//   }, [isAutoMode]);

//   /** 🔁 Refresh every 4 hours (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, [isAutoMode]);

//   /** 📱 Refresh on resume (if auto mode) */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         const cooldownPassed =
//           now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//         if (cooldownPassed) {
//           console.log('📱 App resumed — refreshing AI suggestion');
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 20,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 0}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 0,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 14,
//         }}>
//         <Text
//           style={{
//             color: theme.colors.foreground2,
//             fontSize: 14,
//             fontWeight: '400',
//             marginTop: 8,
//           }}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 14,
//               fontWeight: '500',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 16,
//               paddingHorizontal: 6,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}

//           {/* 🪄 Predictive Fields (only render if present) */}
//           {aiData?.seasonalForecast && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={500}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               🍂 {aiData.seasonalForecast}
//             </Animatable.Text>
//           )}

//           {aiData?.lifecycleForecast && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={600}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               ⏳ {aiData.lifecycleForecast}
//             </Animatable.Text>
//           )}

//           {aiData?.styleTrajectory && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={700}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               📊 {aiData.styleTrajectory}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       {/* 🔁 Buttons */}
//       <View style={{alignItems: 'center'}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 14, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: tokens.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, marginTop: 6, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

////////////////////

// // src/components/AiStylistSuggestions/AiStylistSuggestions.tsx
// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
//   seasonalForecast?: string;
//   lifecycleForecast?: string;
//   styleTrajectory?: string;
// };

// // 🔁 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   weather,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false); // 🔥 persisted mode

//   // 📊 Memory refs
//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       // 🧠 Notify only if significant change
//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 🗂️ Load persisted toggle — default to manual if not set */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);

//         if (saved === null) {
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Persist toggle change */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch once on mount (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       } else {
//         console.log('⏸️ Skipping AI fetch — cooldown not reached');
//       }
//     }
//   }, [isAutoMode]);

//   /** 🔁 Refresh every 4 hours (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, [isAutoMode]);

//   /** 📱 Refresh on resume (if auto mode) */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         const cooldownPassed =
//           now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//         if (cooldownPassed) {
//           console.log('📱 App resumed — refreshing AI suggestion');
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 20,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 0}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 0,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 14,
//         }}>
//         <Text
//           style={{
//             color: theme.colors.foreground2,
//             fontSize: 14,
//             fontWeight: '400',
//             marginTop: 8,
//           }}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 14,
//               fontWeight: '500',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 16,
//               paddingHorizontal: 6,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}

//           {/* 🪄 Predictive Fields (only render if present) */}
//           {aiData?.seasonalForecast && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={500}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               🍂 {aiData.seasonalForecast}
//             </Animatable.Text>
//           )}

//           {aiData?.lifecycleForecast && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={600}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               ⏳ {aiData.lifecycleForecast}
//             </Animatable.Text>
//           )}

//           {aiData?.styleTrajectory && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={700}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               📊 {aiData.styleTrajectory}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       {/* 🔁 Buttons */}
//       <View style={{alignItems: 'center'}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 14, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: tokens.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, marginTop: 6, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

/////////////////////

// // src/components/AiStylistSuggestions/AiStylistSuggestions.tsx
// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// // 🔁 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   // theme,
//   weather,
//   // globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false); // 🔥 persisted mode

//   // 📊 Memory refs
//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       // 🧠 Notify only if significant change
//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 🗂️ Load persisted toggle — default to manual if not set */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);

//         if (saved === null) {
//           // ✅ First-time user or reinstalled app: force manual mode
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         // ✅ Fallback default
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Persist toggle change */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch once on mount (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       } else {
//         console.log('⏸️ Skipping AI fetch — cooldown not reached');
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isAutoMode]);

//   /** 🔁 Refresh every 4 hours (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, [isAutoMode]);

//   /** 📱 Refresh on resume (if auto mode) */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         const cooldownPassed =
//           now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//         if (cooldownPassed) {
//           console.log('📱 App resumed — refreshing AI suggestion');
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 20,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 0}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 0,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 14,
//         }}>
//         <Text
//           style={{
//             color: theme.colors.foreground2,
//             fontSize: 14,
//             fontWeight: '400',
//             marginTop: 8,
//           }}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 14,
//               fontWeight: '500',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 16,
//               paddingHorizontal: 6,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       {/* 🔁 Buttons */}
//       <View style={{alignItems: 'center'}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 14, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: tokens.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, marginTop: 6, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

////////////////

// // src/components/AiStylistSuggestions/AiStylistSuggestions.tsx
// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// // 🔁 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   // theme,
//   weather,
//   // globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false); // 🔥 persisted mode

//   // 📊 Memory refs
//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       // 🧠 Notify only if significant change
//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 🗂️ Load persisted toggle */
//   // useEffect(() => {
//   //   (async () => {
//   //     try {
//   //       const saved = await AsyncStorage.getItem(STORAGE_KEY);
//   //       if (saved !== null) setIsAutoMode(saved === 'true');
//   //     } catch (e) {
//   //       console.warn('⚠️ Failed to load auto mode setting', e);
//   //     }
//   //   })();
//   // }, []);

//   /** 🗂️ Load persisted toggle — default to manual if not set */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);

//         if (saved === null) {
//           // ✅ First-time user or reinstalled app: force manual mode
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         // ✅ Fallback default
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Persist toggle change */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch once on mount (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       } else {
//         console.log('⏸️ Skipping AI fetch — cooldown not reached');
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isAutoMode]);

//   /** 🔁 Refresh every 4 hours (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, [isAutoMode]);

//   /** 📱 Refresh on resume (if auto mode) */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         const cooldownPassed =
//           now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//         if (cooldownPassed) {
//           console.log('📱 App resumed — refreshing AI suggestion');
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 20,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         borderWidth: theme.borderWidth.xl,
//         borderColor: theme.colors.surface3,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 0}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 0,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 14,
//         }}>
//         <Text
//           style={{
//             color: theme.colors.foreground2,
//             fontSize: 14,
//             fontWeight: '400',
//             marginTop: 8,
//           }}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 14,
//               fontWeight: '500',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 16,
//               paddingHorizontal: 6,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//                 marginHorizontal: 16,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       {/* 🔁 Buttons */}
//       <View style={{alignItems: 'center'}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 14, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: tokens.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, marginTop: 6, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

/////////////////

// // src/components/AiStylistSuggestions/AiStylistSuggestions.tsx
// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// // 🔁 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   // theme,
//   weather,
//   // globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false); // 🔥 persisted mode

//   // 📊 Memory refs
//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       // 🧠 Notify only if significant change
//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 🗂️ Load persisted toggle */
//   // useEffect(() => {
//   //   (async () => {
//   //     try {
//   //       const saved = await AsyncStorage.getItem(STORAGE_KEY);
//   //       if (saved !== null) setIsAutoMode(saved === 'true');
//   //     } catch (e) {
//   //       console.warn('⚠️ Failed to load auto mode setting', e);
//   //     }
//   //   })();
//   // }, []);

//   /** 🗂️ Load persisted toggle — default to manual if not set */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);

//         if (saved === null) {
//           // ✅ First-time user or reinstalled app: force manual mode
//           setIsAutoMode(false);
//           await AsyncStorage.setItem(STORAGE_KEY, 'false');
//         } else {
//           setIsAutoMode(saved === 'true');
//         }
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//         // ✅ Fallback default
//         setIsAutoMode(false);
//       }
//     })();
//   }, []);

//   /** 💾 Persist toggle change */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch once on mount (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       } else {
//         console.log('⏸️ Skipping AI fetch — cooldown not reached');
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isAutoMode]);

//   /** 🔁 Refresh every 4 hours (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, [isAutoMode]);

//   /** 📱 Refresh on resume (if auto mode) */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         const cooldownPassed =
//           now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//         if (cooldownPassed) {
//           console.log('📱 App resumed — refreshing AI suggestion');
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 16,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 6}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 6,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 16,
//         }}>
//         <Text
//           style={{
//             color: theme.colors.foreground2,
//             fontSize: 14,
//             fontWeight: '500',
//           }}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 14,
//               fontWeight: '500',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 12,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       {/* 🔁 Buttons */}
//       <View style={{alignItems: 'center'}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 16, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: theme.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

/////////////////////

// // src/components/AiStylistSuggestions/AiStylistSuggestions.tsx
// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
//   Switch,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// // 🔁 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown
// const STORAGE_KEY = 'aiStylistAutoMode';

// const AiStylistSuggestions: React.FC<Props> = ({
//   // theme,
//   weather,
//   // globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isAutoMode, setIsAutoMode] = useState(false); // 🔥 persisted mode

//   // 📊 Memory refs
//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       // 🧠 Notify only if significant change
//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 🗂️ Load persisted toggle */
//   useEffect(() => {
//     (async () => {
//       try {
//         const saved = await AsyncStorage.getItem(STORAGE_KEY);
//         if (saved !== null) setIsAutoMode(saved === 'true');
//       } catch (e) {
//         console.warn('⚠️ Failed to load auto mode setting', e);
//       }
//     })();
//   }, []);

//   /** 💾 Persist toggle change */
//   useEffect(() => {
//     AsyncStorage.setItem(STORAGE_KEY, isAutoMode.toString()).catch(e =>
//       console.warn('⚠️ Failed to save auto mode setting', e),
//     );
//   }, [isAutoMode]);

//   /** 📡 Auto-fetch once on mount (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       const now = Date.now();
//       const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//       if (!aiData || cooldownPassed) {
//         fetchSuggestion('initial');
//         lastFetchTimeRef.current = now;
//       } else {
//         console.log('⏸️ Skipping AI fetch — cooldown not reached');
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isAutoMode]);

//   /** 🔁 Refresh every 4 hours (if auto mode) */
//   useEffect(() => {
//     if (isAutoMode) {
//       refreshTimerRef.current = setInterval(() => {
//         fetchSuggestion('scheduled');
//       }, NOTIFICATION_COOLDOWN_MS);
//     }
//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, [isAutoMode]);

//   /** 📱 Refresh on resume (if auto mode) */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (isAutoMode && state === 'active') {
//         const now = Date.now();
//         const cooldownPassed =
//           now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//         if (cooldownPassed) {
//           console.log('📱 App resumed — refreshing AI suggestion');
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, [isAutoMode]);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 16,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: tokens.borderRadius.md,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 6}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 6,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 🧠 Manual / Auto Switch */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 16,
//         }}>
//         <Text
//           style={{
//             color: theme.colors.foreground2,
//             fontSize: 14,
//             fontWeight: '500',
//           }}>
//           Mode: {isAutoMode ? 'Automatic Mode' : 'Manual Mode'}
//         </Text>
//         <Switch
//           value={isAutoMode}
//           onValueChange={setIsAutoMode}
//           trackColor={{false: '#555', true: theme.colors.button1}}
//           thumbColor={isAutoMode ? '#fff' : '#ccc'}
//         />
//       </View>

//       {/* 💬 Suggestion */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 14,
//               fontWeight: '500',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 12,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       {/* 🔁 Buttons */}
//       <View style={{alignItems: 'center'}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 16, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: theme.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

////////////////////////

// // src/components/AiStylistSuggestions/AiStylistSuggestions.tsx
// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// // 🔁 Cooldown windows
// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h notification interval
// const FETCH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h re-fetch cooldown

// const AiStylistSuggestions: React.FC<Props> = ({
//   theme,
//   weather,
//   globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // 📊 Memory refs
//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const lastFetchTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {user: userName, weather, wardrobe, preferences};
//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       // 🧠 Notification logic (only if suggestion meaningfully changed)
//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60);

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//       lastFetchTimeRef.current = now;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion if API fails */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 📡 Auto-fetch once on mount (smart cooldown) */
//   useEffect(() => {
//     const now = Date.now();
//     const cooldownPassed = now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//     if (!aiData || cooldownPassed) {
//       fetchSuggestion('initial');
//       lastFetchTimeRef.current = now;
//     } else {
//       console.log(
//         '⏸️ Skipping AI fetch — data exists and cooldown not reached',
//       );
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   /** 🔁 Refresh every 4 hours */
//   useEffect(() => {
//     refreshTimerRef.current = setInterval(() => {
//       fetchSuggestion('scheduled');
//     }, NOTIFICATION_COOLDOWN_MS);

//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, []);

//   /** 📱 Refresh when app comes to foreground */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (state === 'active') {
//         const now = Date.now();
//         const cooldownPassed =
//           now - lastFetchTimeRef.current > FETCH_COOLDOWN_MS;

//         if (cooldownPassed) {
//           console.log('📱 App resumed — refreshing AI suggestion');
//           fetchSuggestion('resume');
//           lastFetchTimeRef.current = now;
//         } else {
//           console.log('📱 App resumed — cooldown not passed, skipping fetch');
//         }
//       }
//     });
//     return () => subscription.remove();
//   }, []);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 16,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: 16,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 6}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 6,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 💬 Suggestion */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 14,
//               fontWeight: '500',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 12,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       {/* 🔁 Buttons */}
//       <View style={{alignItems: 'center'}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 16, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: theme.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

/////////////////////

// // AUTOMATED VERSION AI AGENT BELOW FULL BLOW BUT RENDERS TOO MUCH

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

// const AiStylistSuggestions: React.FC<Props> = ({
//   theme,
//   weather,
//   globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const lastSuggestionRef = useRef<string | null>(null);
//   const lastNotifyTimeRef = useRef<number>(0);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {
//         user: userName,
//         weather,
//         wardrobe,
//         preferences,
//       };

//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);
//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);
//       setAiData(data);

//       // 🧠 Only notify if new suggestion is significantly different AND cooldown passed
//       const now = Date.now();
//       const significantChange =
//         lastSuggestionRef.current &&
//         data.suggestion.slice(0, 60) !== lastSuggestionRef.current.slice(0, 60); // ignore minor rewording

//       if (
//         significantChange &&
//         now - lastNotifyTimeRef.current > NOTIFICATION_COOLDOWN_MS
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//         lastNotifyTimeRef.current = now;
//       }

//       lastSuggestionRef.current = data.suggestion;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Fallback suggestion */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 📡 Auto-fetch only ONCE on mount */
//   useEffect(() => {
//     fetchSuggestion('initial');
//     // ⛔ intentionally no dependencies to prevent infinite loops
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   /** 🔁 Refresh every 4 hours */
//   useEffect(() => {
//     refreshTimerRef.current = setInterval(() => {
//       fetchSuggestion('scheduled');
//     }, NOTIFICATION_COOLDOWN_MS);
//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, []);

//   /** 📱 Refresh when app returns to foreground */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (state === 'active') {
//         console.log('📱 App resumed — refreshing AI suggestion');
//         fetchSuggestion('resume');
//       }
//     });
//     return () => subscription.remove();
//   }, []);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 16,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: 16,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 6}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 6,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 💬 Suggestion */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 14,
//               fontWeight: '500',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 12,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       <View style={{alignItems: 'center'}}>
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 16, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: theme.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

/////////////////////

// AUTOMATED VERSION AI AGENT BELOW

// src/components/AiStylistSuggestions/AiStylistSuggestions.tsx
// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   AppState,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';
// import PushNotification from 'react-native-push-notification';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// const AiStylistSuggestions: React.FC<Props> = ({
//   theme,
//   weather,
//   globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const lastSuggestionRef = useRef<string | null>(null);
//   const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

//   /** 🧠 Fetch AI suggestion from backend */
//   const fetchSuggestion = async (trigger: string = 'manual') => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {
//         user: userName,
//         weather,
//         wardrobe,
//         preferences,
//       };

//       console.log(`🤖 Fetching AI suggestion (trigger: ${trigger})`);
//       console.log('📦 Payload:', JSON.stringify(payload));

//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data: AiSuggestionResponse = await res.json();
//       console.log('✅ AI suggestion data:', data);

//       setAiData(data);

//       // 🔔 Notify user only if new suggestion is significantly different
//       if (
//         lastSuggestionRef.current &&
//         data.suggestion !== lastSuggestionRef.current
//       ) {
//         PushNotification.localNotification({
//           title: '✨ New Style Suggestion Ready',
//           message: data.suggestion,
//           channelId: 'ai-suggestions',
//         });
//       }

//       lastSuggestionRef.current = data.suggestion;
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 🧠 Fallback suggestion when AI unavailable */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers.';
//     else if (temp < 65)
//       base =
//         'Mild — lightweight layers and versatile pieces will keep you ready.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool.';
//     else if (temp < 90) base = 'Hot — keep it ultra-light, airy, and minimal.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Waterproof layers will keep you dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   /** 📡 Auto-fetch on mount, context change, and schedule */
//   useEffect(() => {
//     // Initial auto-fetch
//     fetchSuggestion('initial');

//     // Re-run whenever weather or wardrobe changes significantly
//     // This is a key behavior difference from a simple chatbot
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [weather?.fahrenheit?.main?.temp, wardrobe?.length]);

//   /** 🔄 Refresh every 4 hours */
//   useEffect(() => {
//     refreshTimerRef.current = setInterval(() => {
//       fetchSuggestion('scheduled');
//     }, 4 * 60 * 60 * 1000); // 4 hours

//     return () => {
//       if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
//     };
//   }, []);

//   /** 💤 Background wake-up when app resumes */
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', state => {
//       if (state === 'active') {
//         console.log('📱 App resumed — refreshing AI suggestion');
//         fetchSuggestion('resume');
//       }
//     });
//     return () => subscription.remove();
//   }, []);

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 16,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: 16,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 6}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 6,
//           }}>
//           AI Stylist Agent
//         </Text>
//       </View>

//       {/* 💬 Suggestion or fallback */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 14,
//               fontWeight: '500',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 12,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       <View style={{alignItems: 'center'}}>
//         {/* 🔘 Manual refresh button */}
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 16, width: 230},
//           ]}
//           onPress={() => fetchSuggestion('manual')}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: theme.borderRadius.md},
//             ]}>
//             Refresh Suggestion
//           </Text>
//         </AppleTouchFeedback>

//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 0,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

/////////////////////////

// AI AGENT TRIGGERED MANUALLY WORKING - BELOW HERE - KEEP

// import React, {useState} from 'react';
// import {View, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// const AiStylistSuggestions: React.FC<Props> = ({
//   theme,
//   weather,
//   globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   /** 🧠 Manual fetch — only runs when button pressed */
//   const fetchSuggestion = async () => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {
//         user: userName,
//         weather,
//         wardrobe,
//         preferences,
//       };

//       console.log('📦 Payload:', JSON.stringify(payload));
//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data = await res.json();
//       console.log('✅ AI suggestion data:', data);

//       setAiData({
//         suggestion: data.suggestion || 'Unable to generate a suggestion.',
//         insight: data.insight || undefined,
//         tomorrow: data.tomorrow || undefined,
//       });
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Local fallback aligned with Weather section */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp)
//       return 'Tap "Generate Suggestions" to get style guidance tailored to today’s weather.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — focus on insulating layers, weather-resistant outerwear, and warm accessories.';
//     else if (temp < 50)
//       base =
//         'Chilly — add mid-weight layers like knitwear or light outer layers for balanced warmth.';
//     else if (temp < 65)
//       base =
//         'Mild and comfortable — lightweight layers and versatile pieces will keep you ready for changing conditions.';
//     else if (temp < 80)
//       base =
//         'Warm — breathable fabrics and relaxed outfits will help you stay cool and comfortable.';
//     else if (temp < 90)
//       base =
//         'Hot — keep it ultra-light, airy, and minimal with moisture-wicking clothing.';
//     else
//       base =
//         'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Consider waterproof layers or accessories to stay dry.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Choose insulated footwear and moisture-resistant outerwear.';
//     if (condition === 'Clear')
//       extra = ' 😎 Sunglasses can add both comfort and style.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

//     return `${base}${extra}`;
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 16,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: 16,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 6}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 6,
//           }}>
//           AI Stylist Suggests
//         </Text>
//       </View>

//       {/* 💬 Suggestion or fallback */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 14,
//               fontWeight: '500',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 12,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       <View style={{alignItems: 'center'}}>
//         {/* 🔘 Button: Trigger AI manually */}
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 16, width: 230},
//           ]}
//           onPress={fetchSuggestion}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: theme.borderRadius.md},
//             ]}>
//             Generate Suggestions
//           </Text>
//         </AppleTouchFeedback>

//         {/* ✨ Only show "Generate Full Look" once AI data is available */}
//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>Generate Look</Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 0,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

//////////////////

// import React, {useState} from 'react';
// import {View, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// const AiStylistSuggestions: React.FC<Props> = ({
//   theme,
//   weather,
//   globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   /** 🧠 Manual fetch — only runs when button pressed */
//   const fetchSuggestion = async () => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {
//         user: userName,
//         weather,
//         wardrobe,
//         preferences,
//       };

//       console.log('📦 Payload:', JSON.stringify(payload));
//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data = await res.json();
//       console.log('✅ AI suggestion data:', data);

//       setAiData({
//         suggestion: data.suggestion || 'Unable to generate a suggestion.',
//         insight: data.insight || undefined,
//         tomorrow: data.tomorrow || undefined,
//       });
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Local fallback aligned with Weather section */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     const condition = weather?.celsius?.weather?.[0]?.main;

//     if (!temp) return 'Tap "Generate Suggestions" to get your style advice.';

//     let base = '';
//     if (temp < 40)
//       base =
//         'Very cold — bundle up with heavy layers, a coat, and winter accessories.';
//     else if (temp < 50)
//       base = 'Chilly — layer a knit and a structured jacket for warmth.';
//     else if (temp < 65)
//       base =
//         'Mild and comfortable — a shirt with a light layer works perfectly.';
//     else if (temp < 80)
//       base = 'Warm — breathable fabrics and easy layering pieces shine.';
//     else if (temp < 90) base = 'Hot — keep it light, airy, and minimal.';
//     else
//       base = 'Scorching — ultra-light pieces and maximum ventilation are key.';

//     let extra = '';
//     if (condition === 'Rain')
//       extra = ' ☔ Grab an umbrella or waterproof outer layer.';
//     if (condition === 'Snow')
//       extra = ' ❄️ Insulated footwear and cozy layers recommended.';
//     if (condition === 'Clear') extra = ' 😎 Sunglasses will complete the look.';
//     if (condition === 'Clouds')
//       extra = ' ☁️ Neutrals and light layers are a smart choice.';

//     return `${base}${extra}`;
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 16,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: 16,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 6}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 6,
//           }}>
//           AI Stylist Suggests
//         </Text>
//       </View>

//       {/* 💬 Suggestion or fallback */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 15,
//               fontWeight: '600',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 12,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       <View style={{alignItems: 'center'}}>
//         {/* 🔘 Button: Trigger AI manually */}
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 16, width: 230},
//           ]}
//           onPress={fetchSuggestion}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: theme.borderRadius.md},
//             ]}>
//             Generate Suggestions
//           </Text>
//         </AppleTouchFeedback>

//         {/* ✨ Only show "Generate Full Look" once AI data is available */}
//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, width: 230},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

/////////////////////

// import React, {useState} from 'react';
// import {View, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// const AiStylistSuggestions: React.FC<Props> = ({
//   theme,
//   weather,
//   globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   /** 🧠 Manual fetch — only runs when button pressed */
//   const fetchSuggestion = async () => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {
//         user: userName,
//         weather,
//         wardrobe,
//         preferences,
//       };

//       console.log('📦 Payload:', JSON.stringify(payload));
//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data = await res.json();
//       console.log('✅ AI suggestion data:', data);

//       setAiData({
//         suggestion: data.suggestion || 'Unable to generate a suggestion.',
//         insight: data.insight || undefined,
//         tomorrow: data.tomorrow || undefined,
//       });
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Local fallback if no AI call made */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     if (!temp) return 'Tap "Generate Suggestions" to get your style advice.';
//     if (temp < 60)
//       return 'Cool out — layer a knit under a trench with your loafers.';
//     if (temp > 85) return 'Warm day — go linen trousers and a Cuban shirt.';
//     return 'Perfect weather — chinos, polo, and monk straps.';
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 16,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: 16,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 6}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 6,
//           }}>
//           AI Stylist Suggests
//         </Text>
//       </View>

//       {/* 💬 Suggestion or fallback */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 15,
//               fontWeight: '600',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 12,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       <View style={{alignItems: 'center'}}>
//         {/* 🔘 Button: Trigger AI manually */}
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 12, width: 230},
//           ]}
//           onPress={fetchSuggestion}>
//           <Text
//             style={[
//               globalStyles.buttonPrimaryText,
//               {borderRadius: theme.borderRadius.md},
//             ]}>
//             Generate Suggestions
//           </Text>
//         </AppleTouchFeedback>

//         {/* ✨ Only show "Generate Full Look" once AI data is available */}
//         {aiData && (
//           <AppleTouchFeedback
//             hapticStyle="impactHeavy"
//             style={[
//               globalStyles.buttonPrimary,
//               {paddingVertical: 13, marginBottom: 12, width: 210},
//             ]}
//             onPress={() =>
//               navigate('Outfit', {
//                 from: 'AiStylistSuggestions',
//                 seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//                 autogenerate: true,
//               })
//             }>
//             <Text style={globalStyles.buttonPrimaryText}>
//               Generate Full Look
//             </Text>
//           </AppleTouchFeedback>
//         )}
//       </View>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

/////////////////////

// import React, {useState} from 'react';
// import {View, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// const AiStylistSuggestions: React.FC<Props> = ({
//   theme,
//   weather,
//   globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   /** 🧠 Manual fetch — only runs when button pressed */
//   const fetchSuggestion = async () => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {
//         user: userName,
//         weather,
//         wardrobe,
//         preferences,
//       };

//       console.log('📦 Payload:', JSON.stringify(payload));
//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data = await res.json();
//       console.log('✅ AI suggestion data:', data);

//       setAiData({
//         suggestion: data.suggestion || 'Unable to generate a suggestion.',
//         insight: data.insight || undefined,
//         tomorrow: data.tomorrow || undefined,
//       });
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//   /** 📍 Local fallback if no AI call made */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     if (!temp) return 'Tap "Generate Suggestions" to get your style advice.';
//     if (temp < 60)
//       return 'Cool out — layer a knit under a trench with your loafers.';
//     if (temp > 85) return 'Warm day — go linen trousers and a Cuban shirt.';
//     return 'Perfect weather — chinos, polo, and monk straps.';
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 16,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: 16,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 6}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 6,
//           }}>
//           AI Stylist Suggests
//         </Text>
//       </View>

//       {/* 💬 Suggestion or fallback */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 15,
//               fontWeight: '600',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 12,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       {/* 🔘 Button: Trigger AI manually */}
//       <AppleTouchFeedback
//         hapticStyle="impactHeavy"
//         style={[
//           globalStyles.buttonPrimary,
//           {paddingVertical: 13, marginBottom: 12},
//         ]}
//         onPress={fetchSuggestion}>
//         <Text
//           style={[
//             globalStyles.buttonPrimaryText,
//             {borderRadius: theme.borderRadius.md},
//           ]}>
//           Generate Suggestions
//         </Text>
//       </AppleTouchFeedback>

//       {/* ✨ Only show "Generate Full Look" once AI data is available */}
//       {aiData && (
//         <AppleTouchFeedback
//           hapticStyle="impactHeavy"
//           style={[
//             globalStyles.buttonPrimary,
//             {paddingVertical: 13, marginBottom: 12},
//           ]}
//           onPress={() =>
//             navigate('Outfit', {
//               from: 'AiStylistSuggestions',
//               seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//               autogenerate: true,
//             })
//           }>
//           <Text style={globalStyles.buttonPrimaryText}>Generate Full Look</Text>
//         </AppleTouchFeedback>
//       )}

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;

//////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState} from 'react';
// import {View, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {API_BASE_URL} from '../../config/api';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
//   userName?: string;
//   wardrobe?: any[];
//   preferences?: any;
// };

// export type AiSuggestionResponse = {
//   suggestion: string;
//   insight?: string;
//   tomorrow?: string;
// };

// const AiStylistSuggestions: React.FC<Props> = ({
//   theme,
//   weather,
//   globalStyles,
//   navigate,
//   userName = 'You',
//   wardrobe = [],
//   preferences = {},
// }) => {
//   const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

// /** 🧠 Fetch AI suggestion from backend */
// useEffect(() => {
//   const fetchSuggestion = async () => {
//     if (!weather?.fahrenheit?.main?.temp) {
//       console.log('⏸️ Weather not ready, skipping AI fetch.');
//       setLoading(false);
//       return;
//     }

//     // 🧠 Prevent re-fetching endlessly
//     if (aiData) {
//       console.log('✅ AI data already loaded — skipping refetch.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);

//       const payload = {
//         user: userName,
//         weather,
//         wardrobe,
//         preferences,
//       };

//       console.log('📦 Payload:', JSON.stringify(payload));
//       const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(payload),
//       });

//       console.log('📡 Response status:', res.status);
//       if (!res.ok) throw new Error('Failed to fetch suggestion');

//       const data = await res.json();
//       console.log('✅ AI suggestion data:', data);

//       setAiData({
//         suggestion: data.suggestion || 'Unable to generate a suggestion.',
//         insight: data.insight || undefined,
//         tomorrow: data.tomorrow || undefined,
//       });
//     } catch (err) {
//       console.error(err);
//       setError('Unable to load AI suggestions right now.');
//     } finally {
//       console.log('🛑 Stopping spinner');
//       setLoading(false);
//     }
//   };

//     fetchSuggestion();
//   }, [weather?.fahrenheit?.main?.temp, aiData]);

//   /** 📍 Fallback logic if backend unavailable */
//   const fallbackSuggestion = () => {
//     const temp = weather?.fahrenheit?.main?.temp;
//     if (!temp) return 'Loading your style suggestions...';
//     if (temp < 60)
//       return 'Cool out — layer a knit under a trench with your loafers.';
//     if (temp > 85) return 'Warm day — go linen trousers and a Cuban shirt.';
//     return 'Perfect weather — chinos, polo, and monk straps.';
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       delay={200}
//       duration={700}
//       useNativeDriver
//       style={{
//         marginHorizontal: 16,
//         marginBottom: 20,
//         backgroundColor: theme.colors.surface,
//         borderRadius: 16,
//         padding: 18,
//       }}>
//       {/* 🧠 Header */}
//       <View
//         style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8, marginBottom: 6}}
//         />
//         <Text
//           style={{
//             fontSize: 18,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//             textTransform: 'uppercase',
//             marginBottom: 6,
//           }}>
//           AI Stylist Suggests
//         </Text>
//       </View>

//       {/* 💬 Suggestion */}
//       {loading && (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       )}

//       {!loading && (
//         <>
//           <Text
//             style={{
//               fontSize: 15,
//               fontWeight: '600',
//               color: theme.colors.foreground,
//               lineHeight: 22,
//               marginBottom: 12,
//             }}>
//             {error
//               ? fallbackSuggestion()
//               : aiData?.suggestion || fallbackSuggestion()}
//           </Text>

//           {/* 📊 Smart Insight */}
//           {aiData?.insight && (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
//                 lineHeight: 20,
//               }}>
//               💡 {aiData.insight}
//             </Animatable.Text>
//           )}

//           {/* 📆 Tomorrow Preview */}
//           {aiData?.tomorrow && (
//             <Animatable.Text
//               animation="fadeInUp"
//               delay={400}
//               style={{
//                 fontSize: 15,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//                 lineHeight: 20,
//               }}>
//               📆 Tomorrow: {aiData.tomorrow}
//             </Animatable.Text>
//           )}
//         </>
//       )}

//       {/* ✨ Primary CTA */}
//       <AppleTouchFeedback
//         hapticStyle="impactHeavy"
//         style={[
//           globalStyles.buttonPrimary,
//           {
//             paddingVertical: 13,
//             marginBottom: 12,
//           },
//         ]}
//         onPress={() =>
//           navigate('Outfit', {
//             from: 'AiStylistSuggestions',
//             seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//             autogenerate: true,
//           })
//         }>
//         <Text
//           style={[
//             globalStyles.buttonPrimaryText,
//             {
//               borderRadius: theme.borderRadius.md,
//             },
//           ]}>
//           Generate Full Look
//         </Text>
//       </AppleTouchFeedback>

//       {/* 🔁 Secondary CTAs */}
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 8,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Wardrobe Gaps
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 16,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Styling Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;
