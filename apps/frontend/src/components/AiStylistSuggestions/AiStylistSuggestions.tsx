/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {API_BASE_URL} from '../../config/api';

type Props = {
  theme: any;
  weather: any;
  globalStyles: any;
  navigate: (screen: string, params?: any) => void;
  userName?: string;
  wardrobe?: any[];
  preferences?: any;
};

export type AiSuggestionResponse = {
  suggestion: string;
  insight?: string;
  tomorrow?: string;
};

const AiStylistSuggestions: React.FC<Props> = ({
  theme,
  weather,
  globalStyles,
  navigate,
  userName = 'You',
  wardrobe = [],
  preferences = {},
}) => {
  const [aiData, setAiData] = useState<AiSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 🧠 Fetch AI suggestion from backend */
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

  //   fetchSuggestion();
  // }, [weather?.fahrenheit?.main?.temp, aiData]);

  /** 📍 Fallback logic if backend unavailable */
  const fallbackSuggestion = () => {
    const temp = weather?.fahrenheit?.main?.temp;
    if (!temp) return 'Loading your style suggestions...';
    if (temp < 60)
      return 'Cool out — layer a knit under a trench with your loafers.';
    if (temp > 85) return 'Warm day — go linen trousers and a Cuban shirt.';
    return 'Perfect weather — chinos, polo, and monk straps.';
  };

  return (
    <Animatable.View
      animation="fadeInUp"
      delay={200}
      duration={700}
      useNativeDriver
      style={{
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 18,
      }}>
      {/* 🧠 Header */}
      <View
        style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
        <Icon
          name="stars"
          size={22}
          color={theme.colors.button1}
          style={{marginRight: 8, marginBottom: 6}}
        />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: theme.colors.foreground,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>
          AI Stylist Suggests
        </Text>
      </View>

      {/* 💬 Suggestion */}
      {loading && (
        <ActivityIndicator
          color={theme.colors.button1}
          style={{marginVertical: 20}}
        />
      )}

      {!loading && (
        <>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: theme.colors.foreground,
              lineHeight: 22,
              marginBottom: 12,
            }}>
            {error
              ? fallbackSuggestion()
              : aiData?.suggestion || fallbackSuggestion()}
          </Text>

          {/* 📊 Smart Insight */}
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
              }}>
              💡 {aiData.insight}
            </Animatable.Text>
          )}

          {/* 📆 Tomorrow Preview */}
          {aiData?.tomorrow && (
            <Animatable.Text
              animation="fadeInUp"
              delay={400}
              style={{
                fontSize: 15,
                color: theme.colors.foreground2,
                marginBottom: 18,
                lineHeight: 20,
              }}>
              📆 Tomorrow: {aiData.tomorrow}
            </Animatable.Text>
          )}
        </>
      )}

      {/* ✨ Primary CTA */}
      <AppleTouchFeedback
        hapticStyle="impactHeavy"
        style={[
          globalStyles.buttonPrimary,
          {
            paddingVertical: 13,
            marginBottom: 12,
          },
        ]}
        onPress={() =>
          navigate('Outfit', {
            from: 'AiStylistSuggestions',
            seedPrompt: aiData?.suggestion || fallbackSuggestion(),
            autogenerate: true,
          })
        }>
        <Text
          style={[
            globalStyles.buttonPrimaryText,
            {
              borderRadius: theme.borderRadius.md,
            },
          ]}>
          Generate Full Look
        </Text>
      </AppleTouchFeedback>

      {/* 🔁 Secondary CTAs */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 8,
        }}>
        <TouchableOpacity onPress={() => navigate('Wardrobe')}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: theme.colors.button1,
              textDecorationLine: 'underline',
            }}>
            View Wardrobe Gaps
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: theme.colors.button1,
              textDecorationLine: 'underline',
            }}>
            Ask a Styling Question →
          </Text>
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );
};

export default AiStylistSuggestions;

/////////////////////

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

//   /** 🧠 Fetch AI suggestion from backend */
//   useEffect(() => {
//     const fetchSuggestion = async () => {
//       if (!weather?.fahrenheit?.main?.temp) {
//         console.log('⏸️ Weather not ready, skipping AI fetch.');
//         setLoading(false);
//         return;
//       }

//       // 🧠 Prevent re-fetching endlessly
//       if (aiData) {
//         console.log('✅ AI data already loaded — skipping refetch.');
//         return;
//       }

//       try {
//         setLoading(true);
//         setError(null);

//         const payload = {
//           user: userName,
//           weather,
//           wardrobe,
//           preferences,
//         };

//         console.log('📦 Payload:', JSON.stringify(payload));
//         const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify(payload),
//         });

//         console.log('📡 Response status:', res.status);
//         if (!res.ok) throw new Error('Failed to fetch suggestion');

//         const data = await res.json();
//         console.log('✅ AI suggestion data:', data);

//         setAiData({
//           suggestion: data.suggestion || 'Unable to generate a suggestion.',
//           insight: data.insight || undefined,
//           tomorrow: data.tomorrow || undefined,
//         });
//       } catch (err) {
//         console.error(err);
//         setError('Unable to load AI suggestions right now.');
//       } finally {
//         console.log('🛑 Stopping spinner');
//         setLoading(false);
//       }
//     };

//     fetchSuggestion();
//   }, [weather?.fahrenheit?.main?.temp, aiData]); // 👈 include aiData so it doesn’t re-run unnecessarily

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
//         padding: 16,
//         shadowColor: '#000',
//         shadowOpacity: 0.08,
//         shadowRadius: 6,
//         shadowOffset: {width: 0, height: 3},
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
//             fontSize: 17,
//             fontWeight: '700',
//             color: theme.colors.foreground,
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
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
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
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
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
//           {paddingVertical: 10, borderRadius: 12, marginBottom: 8},
//         ]}
//         onPress={() =>
//           navigate('Outfit', {
//             from: 'AiStylistSuggestions',
//             seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//             autogenerate: true,
//           })
//         }>
//         <Text style={globalStyles.buttonPrimaryText}>Generate Full Look</Text>
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

/////////////////

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

//   /** 🧠 Fetch AI suggestion from backend */
//   useEffect(() => {
//     const fetchSuggestion = async () => {
//       try {
//         if (!weather?.fahrenheit?.main?.temp) {
//           console.log('⏸️ Weather not ready, skipping AI fetch.');
//           setLoading(false);
//           return;
//         }

//         setLoading(true);
//         setError(null);

//         const payload = {
//           user: userName,
//           weather,
//           wardrobe,
//           preferences,
//         };

//         console.log('📦 Payload:', JSON.stringify(payload));
//         const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify(payload),
//         });

//         console.log('📡 Response status:', res.status);
//         if (!res.ok) throw new Error('Failed to fetch suggestion');

//         const data = await res.json();
//         console.log('✅ AI suggestion data:', data);

//         setAiData({
//           suggestion: data.suggestion || 'Unable to generate a suggestion.',
//           insight: data.insight || undefined,
//           tomorrow: data.tomorrow || undefined,
//         });
//       } catch (err) {
//         console.error(err);
//         setError('Unable to load AI suggestions right now.');
//       } finally {
//         console.log('🛑 Stopping spinner');
//         setLoading(false);
//       }
//     };

//     fetchSuggestion();
//   }, [weather?.fahrenheit?.main?.temp]);

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
//         padding: 16,
//         shadowColor: '#000',
//         shadowOpacity: 0.08,
//         shadowRadius: 6,
//         shadowOffset: {width: 0, height: 3},
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
//             fontSize: 17,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//           }}>
//           AI Stylist Suggests
//         </Text>
//       </View>

//       {/* 💬 Suggestion */}
//       {loading ? (
//         <ActivityIndicator
//           color={theme.colors.button1}
//           style={{marginVertical: 20}}
//         />
//       ) : (
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
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 fontStyle: 'italic',
//                 marginBottom: 14,
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
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
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
//           {paddingVertical: 10, borderRadius: 12, marginBottom: 8},
//         ]}
//         onPress={() =>
//           navigate('Outfit', {
//             from: 'AiStylistSuggestions',
//             seedPrompt: aiData?.suggestion || fallbackSuggestion(),
//             autogenerate: true,
//           })
//         }>
//         <Text style={globalStyles.buttonPrimaryText}>Generate Full Look</Text>
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

//////////////////////

// // src/components/AiStylistSuggestions/AiStylistSuggestions.tsx
// import React from 'react';
// import {View, Text, TouchableOpacity} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   theme: any;
//   weather: any;
//   globalStyles: any;
//   navigate: (screen: string, params?: any) => void;
// };

// const AiStylistSuggestions: React.FC<Props> = ({
//   theme,
//   weather,
//   globalStyles,
//   navigate,
// }) => {
//   // 🧠 AI Suggestion Text logic
//   const getSuggestionText = () => {
//     if (!weather?.fahrenheit?.main?.temp)
//       return 'Loading your style suggestions...';

//     const temp = weather.fahrenheit.main.temp;

//     if (temp < 60) {
//       return 'Cool out — layer a knit under a trench with your loafers.';
//     } else if (temp > 85) {
//       return 'Warm day — go linen trousers and a Cuban shirt.';
//     } else {
//       return 'Perfect weather — chinos, polo, and monk straps.';
//     }
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
//         padding: 16,
//       }}>
//       <View
//         style={{
//           flexDirection: 'row',
//           alignItems: 'center',
//           marginBottom: 10,
//         }}>
//         <Icon
//           name="stars"
//           size={22}
//           color={theme.colors.button1}
//           style={{marginRight: 8}}
//         />
//         <Text
//           style={{
//             fontSize: 17,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//           }}>
//           AI Stylist Suggests
//         </Text>
//       </View>

//       <Text
//         style={{
//           fontSize: 14,
//           fontWeight: '500',
//           color: theme.colors.foreground2,
//           lineHeight: 20,
//           marginBottom: 12,
//         }}>
//         {getSuggestionText()}
//       </Text>

//       <AppleTouchFeedback
//         hapticStyle="impactHeavy"
//         style={[
//           globalStyles.buttonPrimary,
//           {paddingVertical: 10, borderRadius: 12},
//         ]}
//         onPress={() => navigate('Outfit')}>
//         <Text style={globalStyles.buttonPrimaryText}>Get Styled</Text>
//       </AppleTouchFeedback>

//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           marginTop: 12,
//         }}>
//         <TouchableOpacity onPress={() => navigate('Wardrobe')}>
//           <Text
//             style={{
//               fontSize: 18,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             View Missing Pieces
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
//           <Text
//             style={{
//               fontSize: 18,
//               fontWeight: '600',
//               color: theme.colors.button1,
//               textDecorationLine: 'underline',
//             }}>
//             Ask a Question →
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </Animatable.View>
//   );
// };

// export default AiStylistSuggestions;
