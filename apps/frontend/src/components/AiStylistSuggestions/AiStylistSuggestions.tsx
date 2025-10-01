import React, {useState} from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 🧠 Manual fetch — only runs when button pressed */
  const fetchSuggestion = async () => {
    if (!weather?.fahrenheit?.main?.temp) {
      console.log('⏸️ Weather not ready, skipping AI fetch.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        user: userName,
        weather,
        wardrobe,
        preferences,
      };

      console.log('📦 Payload:', JSON.stringify(payload));
      const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', res.status);
      if (!res.ok) throw new Error('Failed to fetch suggestion');

      const data = await res.json();
      console.log('✅ AI suggestion data:', data);

      setAiData({
        suggestion: data.suggestion || 'Unable to generate a suggestion.',
        insight: data.insight || undefined,
        tomorrow: data.tomorrow || undefined,
      });
    } catch (err) {
      console.error(err);
      setError('Unable to load AI suggestions right now.');
    } finally {
      console.log('🛑 Stopping spinner');
      setLoading(false);
    }
  };

  /** 📍 Local fallback aligned with Weather section */
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
        'Chilly — add mid-weight layers like knitwear or light outer layers for balanced warmth.';
    else if (temp < 65)
      base =
        'Mild and comfortable — lightweight layers and versatile pieces will keep you ready for changing conditions.';
    else if (temp < 80)
      base =
        'Warm — breathable fabrics and relaxed outfits will help you stay cool and comfortable.';
    else if (temp < 90)
      base =
        'Hot — keep it ultra-light, airy, and minimal with moisture-wicking clothing.';
    else
      base =
        'Scorching — prioritize ventilation, loose fits, and sun-protective materials.';

    let extra = '';
    if (condition === 'Rain')
      extra = ' ☔ Consider waterproof layers or accessories to stay dry.';
    if (condition === 'Snow')
      extra = ' ❄️ Choose insulated footwear and moisture-resistant outerwear.';
    if (condition === 'Clear')
      extra = ' 😎 Sunglasses can add both comfort and style.';
    if (condition === 'Clouds')
      extra = ' ☁️ Neutral tones and flexible layering pieces will work well.';

    return `${base}${extra}`;
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

      {/* 💬 Suggestion or fallback */}
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
              fontSize: 14,
              fontWeight: '500',
              color: theme.colors.foreground,
              lineHeight: 22,
              marginBottom: 12,
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
              }}>
              📆 Tomorrow: {aiData.tomorrow}
            </Animatable.Text>
          )}
        </>
      )}

      <View style={{alignItems: 'center'}}>
        {/* 🔘 Button: Trigger AI manually */}
        <AppleTouchFeedback
          hapticStyle="impactHeavy"
          style={[
            globalStyles.buttonPrimary,
            {paddingVertical: 13, marginBottom: 16, width: 230},
          ]}
          onPress={fetchSuggestion}>
          <Text
            style={[
              globalStyles.buttonPrimaryText,
              {borderRadius: theme.borderRadius.md},
            ]}>
            Generate Suggestions
          </Text>
        </AppleTouchFeedback>

        {/* ✨ Only show "Generate Full Look" once AI data is available */}
        {aiData && (
          <AppleTouchFeedback
            hapticStyle="impactHeavy"
            style={[
              globalStyles.buttonPrimary,
              {paddingVertical: 13, marginBottom: 12, width: 230},
            ]}
            onPress={() =>
              navigate('Outfit', {
                from: 'AiStylistSuggestions',
                seedPrompt: aiData?.suggestion || fallbackSuggestion(),
                autogenerate: true,
              })
            }>
            <Text style={globalStyles.buttonPrimaryText}>Generate Look</Text>
          </AppleTouchFeedback>
        )}
      </View>

      {/* 🔁 Secondary CTAs */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 0,
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
