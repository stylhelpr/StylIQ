// src/utils/routeVoiceCommand.ts
import {Alert} from 'react-native';
import Tts from 'react-native-tts';
import {fetchWeather} from '../travelWeather';
import {
  initializeNotifications,
  scheduleLocalNotification,
} from '../notificationService';
import {matchVoiceCommand} from './voiceCommandMap';
import {VoiceMemory} from './VoiceMemory';
import {VoiceBus} from './VoiceBus';
import {instantSpeak} from './instantTts';
import {Linking} from 'react-native';

/**
 * Global voice command router for StylHelpr.
 * Handles natural navigation phrases and conversational fallbacks.
 */
export const routeVoiceCommand = async (
  command: string,
  navigate: (screen: string, params?: any) => void,
): Promise<void> => {
  const lower = command.toLowerCase().trim();
  console.log('🎙️ Routing voice command →', lower);

  // 🔍 Check the centralized map first
  if (matchVoiceCommand(lower, navigate)) return;

  const go = (screen: string, label: string): void => {
    navigate(screen);
    // Tts.speak(`Opening ${label}`);
  };

  const includesAny = (keys: string[]): boolean =>
    keys.some(k => lower.includes(k));

  // ---------------------------
  // 🔹 Navigation Intents
  // ---------------------------
  if (includesAny(['login', 'sign in', 'log in'])) return go('Login', 'Login');
  if (includesAny(['home', 'main'])) return go('Home', 'Home');
  if (includesAny(['profile', 'account'])) return go('Profile', 'Profile');
  if (includesAny(['style profile', 'styling profile', 'style settings']))
    return go('StyleProfileScreen', 'Style Profile');
  if (includesAny(['fashion news', 'news', 'news stories']))
    return go('Explore', 'Explore');
  if (includesAny(['wardrobe', 'closet'])) return go('Wardrobe', 'Wardrobe');
  if (includesAny(['settings', 'preferences', 'options']))
    return go('Settings', 'Settings');
  if (includesAny(['barcode', 'scanner', 'scan']))
    return go('BarcodeScannerScreen', 'Barcode Scanner');
  if (includesAny(['measurements', 'sizes', 'fit data']))
    return go('Measurements', 'Measurements');
  if (includesAny(['budget', 'brands', 'spending']))
    return go('BudgetAndBrands', 'Budget and Brands');
  if (includesAny(['appearance', 'look settings']))
    return go('Appearance', 'Appearance');
  if (includesAny(['lifestyle', 'daily life', 'routine']))
    return go('Lifestyle', 'Lifestyle');
  if (includesAny(['style summary', 'summary']))
    return go('StyleSummary', 'Style Summary');
  if (includesAny(['activities', 'hobbies']))
    return go('Activities', 'Activities');
  if (includesAny(['body types', 'body type']))
    return go('BodyTypes', 'Body Types');
  if (includesAny(['shop', 'shopping, browser']))
    return go('ShoppingDashboard');
  if (includesAny(['climate', 'weather preferences']))
    return go('Climate', 'Climate');
  if (includesAny(['color preferences', 'favorite colors']))
    return go('ColorPreferences', 'Color Preferences');
  if (includesAny(['eye color'])) return go('EyeColor', 'Eye Color');
  if (includesAny(['fashion goals', 'style goals']))
    return go('FashionGoals', 'Fashion Goals');
  if (includesAny(['fit preferences']))
    return go('FitPreferences', 'Fit Preferences');
  if (includesAny(['hair color'])) return go('HairColor', 'Hair Color');
  if (includesAny(['personality', 'traits']))
    return go('PersonalityTraits', 'Personality Traits');
  if (includesAny(['preference strength']))
    return go('PreferenceStrength', 'Preference Strength');
  if (includesAny(['proportions', 'body proportions']))
    return go('Proportions', 'Proportions');
  if (includesAny(['search', 'find'])) return go('Search', 'Search');
  if (includesAny(['skin tone', 'complexion']))
    return go('SkinTone', 'Skin Tone');
  if (includesAny(['style icon'])) return go('StyleIcon', 'Style Icon');
  if (includesAny(['voice', 'assistant']))
    return go('Voice', 'Voice Assistant');
  if (includesAny(['item detail', 'details']))
    return go('ItemDetail', 'Item Detail');
  if (includesAny(['add item', 'add clothing', 'new item']))
    return go('AddItem', 'Add Item');
  if (includesAny(['outfit builder', 'build outfit']))
    return go('OutfitBuilder', 'Outfit Builder');
  if (includesAny(['style me', 'create outfit'])) return go('Outfit', 'Outfit');
  if (includesAny(['saved outfits', 'saved looks']))
    return go('SavedOutfits', 'Saved Outfits');
  if (includesAny(['try on', 'overlay'])) return go('TryOnOverlay', 'Try On');
  if (includesAny(['notifications', 'alerts']))
    return go('Notifications', 'Notifications');
  if (includesAny(['undertone', 'undertones']))
    return go('Undertone', 'Undertone');
  if (includesAny(['style keywords', 'keywords']))
    return go('StyleKeywords', 'Style Keywords');
  if (includesAny(['personal information', 'personal info']))
    return go('PersonalInformation', 'Personal Information');
  if (includesAny(['contact'])) return go('ContactScreen', 'Contact');
  // if (includesAny(['about', 'about stylhelpr']))
  //   return go('AboutScreen', 'About');
  if (includesAny(['feedback', 'support']))
    return go('FeedbackScreen', 'Feedback');
  if (
    includesAny([
      'ai stylist',
      'ai chat',
      'stylist chat',
      'chatbot',
      'assistant',
      'chat',
    ])
  )
    return go('AiStylistChatScreen', 'AI Stylist Chat');
  if (includesAny(['recreated look', 'recreate']))
    return go('RecreatedLook', 'Recreated Look');
  if (includesAny(['web page', 'browser']))
    return go('WebPageScreen', 'Web Page');
  if (includesAny(['planner', 'schedule', 'calendar']))
    return go('Planner', 'Planner');

  if (
    lastIntent === 'navigation' &&
    (lower.includes('back') || lower.includes('previous'))
  ) {
    navigate('Home');
    return;
  }

  // ---------------------------
  // 🔙 Backward Navigation (Fixed)
  // ---------------------------
  if (includesAny(['back', 'previous', 'go back'])) {
    try {
      // Call navigate with a special flag or your back action handler
      if (navigate && typeof navigate === 'function') {
        navigate('..'); // or use your stack goBack logic here
      } else {
        console.log('⚠️ No navigation function available');
      }

      VoiceMemory.set('lastIntent', 'navigation');
      VoiceMemory.set('lastTopic', 'back');
      console.log('🔙 Navigating back (via navigate)');
      return;
    } catch (err) {
      console.log('⚠️ Back navigation failed (via navigate):', err);
    }
  }

  if (includesAny(['back', 'previous', 'go back'])) {
    navigate('..'); // equivalent to goBack()
    VoiceMemory.set('lastIntent', 'navigation');
    VoiceMemory.set('lastTopic', 'back');
    console.log('🔙 Navigating back');
    return;
  }

  // ----------------------------
  // 🧠 Memory-driven commands
  // ----------------------------
  if (includesAny(['show me', 'find', 'search'])) {
    const query = lower
      .replace(/show me|find|search|for|look for/gi, '')
      .trim();

    if (query) VoiceMemory.set('lastItem', query);
    navigate('RecreatedScreen', {search: query});
    return;
  }

  if (includesAny(['match', 'goes with'])) {
    const last = VoiceMemory.get('lastItem');
    if (last) {
      navigate('SearchScreen', {matchItem: last});
      return;
    }
    Alert.alert('Need Context', 'Try saying “Show me linen shirts” first.');
    return;
  }

  if (includesAny(['forget', 'clear memory'])) {
    VoiceMemory.clear();
    Alert.alert('Memory Cleared', 'I forgot your last request.');
    return;
  }

  // ----------------------------
  // 🔁 Contextual chaining layer
  // ----------------------------
  try {
    // record every command
    VoiceMemory.pushContext({role: 'user', text: lower, timestamp: Date.now()});

    const lastUser = VoiceMemory.getLastUser();
    const lastAssistant = VoiceMemory.getLastAssistant();

    // 🧠 handle follow-ups like “what about …” or “and …”
    if (lower.startsWith('what about') || lower.startsWith('and')) {
      // “what about tomorrow” → delegate to weather follow-up
      if (lastUser?.text.includes('weather')) {
        await routeVoiceCommand('weather tomorrow', navigate);
        return;
      }

      // “what about miami” → delegate to city follow-up
      const match = lower.match(/what about\s+([a-z\s]+)/i);
      if (match && match[1]) {
        const city = match[1].trim();
        await routeVoiceCommand(`weather in ${city}`, navigate);
        return;
      }

      // “what about another outfit” → reuse outfit flow
      if (lastUser?.text.includes('outfit')) {
        await routeVoiceCommand('suggest another outfit', navigate);
        return;
      }
    }

    // 🧠 handle confirmers like “yes”, “that one”, “okay”
    if (/\b(yes|sure|ok|that one|looks good)\b/i.test(lower)) {
      if (lastAssistant?.data?.link) {
        Linking.openURL(lastAssistant.data.link);
        return;
      }
    }

    // 🧠 handle “what else” style continuation
    if (/\b(what else|more options|show more)\b/i.test(lower)) {
      const lastIntent = VoiceMemory.get('lastIntent');
      if (lastIntent === 'style' || lastIntent === 'outfit') {
        await routeVoiceCommand('show me more outfits', navigate);
        return;
      }
      if (lastIntent === 'weather') {
        await routeVoiceCommand('weather tomorrow', navigate);
        return;
      }
    }
  } catch (err) {
    console.log('⚠️ Context chaining failed:', err);
  }

  // ----------------------------
  // 🔁 Generic follow-ups for other intents
  // ----------------------------
  const lastIntent = VoiceMemory.get('lastIntent');
  const lastTopic = VoiceMemory.get('lastTopic');
  const lastItem = VoiceMemory.get('lastItem');

  if (lower.startsWith('what about') || lower.startsWith('and')) {
    // 🧥 Style/Outfit follow-up
    if (lastIntent === 'style' || lastIntent === 'outfit') {
      if (lower.includes('another') || lower.includes('different'))
        return routeVoiceCommand('show me another outfit', navigate);
      if (lower.includes('darker') || lower.includes('formal'))
        return routeVoiceCommand('show me a darker outfit', navigate);
    }

    // 🗺️ Travel / Location follow-up
    if (lastIntent === 'travel') {
      const match = lower.match(/what about\s+([a-z\s]+)/i);
      if (match?.[1])
        return routeVoiceCommand(`what can i do in ${match[1]}`, navigate);
    }

    // 📅 Planner follow-up
    if (lastIntent === 'planner' && lower.includes('tomorrow'))
      return routeVoiceCommand('show my schedule tomorrow', navigate);
  }

  // 🧩 Weather follow-up: "in <city>"
  if (
    VoiceMemory.get('lastCommand') === 'weather' &&
    lower.match(/\b(in|for|about)\s+([a-z\s]+)$/i)
  ) {
    try {
      const match = lower.match(/\b(in|for|about)\s+([a-z\s]+)$/i);
      const city = match?.[2]?.trim();
      if (!city) return;

      VoiceMemory.set('lastCity', city);

      // Use same fallback coords if none found
      let lat = 34.05;
      let lon = -118.24;

      const weatherResponse = await fetchWeather(lat, lon, 'imperial');
      const data = weatherResponse?.fahrenheit;

      const condition =
        data?.weather?.[0]?.description || data?.description || 'clear skies';
      const temperature = Math.round(data?.main?.temp ?? 0);

      VoiceBus.emit('weather', {city, temperature, condition});
      VoiceMemory.set('lastCommand', 'weather');
      VoiceMemory.set('lastCity', city);
      VoiceMemory.set('lastCondition', condition);
      VoiceMemory.set('lastTemp', temperature);

      console.log(`🌍 Weather follow-up city switch → ${city}`);
    } catch (err) {
      console.log('⚠️ Weather follow-up (city) failed:', err);
    }
    return;
  }

  // 🧩 Weather follow-up: "tomorrow"
  if (
    VoiceMemory.get('lastCommand') === 'weather' &&
    includesAny(['tomorrow', 'next day'])
  ) {
    try {
      let lat: number | undefined;
      let lon: number | undefined;

      try {
        const hasPermission = await ensureLocationPermission?.();
        if (hasPermission && global.Geolocation) {
          const position = await new Promise<Geolocation.GeoPosition>(
            (resolve, reject) =>
              Geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 1000,
              }),
          );
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        }
      } catch {
        console.log('⚠️ Geolocation unavailable, falling back to default');
      }

      if (!lat || !lon) {
        lat = 34.05;
        lon = -118.24;
      }

      const weatherResponse = await fetchWeather(lat, lon, 'imperial');
      const data = weatherResponse?.fahrenheit;

      const city = data?.name || VoiceMemory.get('lastCity') || 'Los Angeles';
      const condition =
        data?.weather?.[0]?.description ||
        data?.description ||
        'similar conditions';
      const temperature = Math.round(data?.main?.temp ?? 0);

      VoiceBus.emit('weather', {city, temperature, condition});
      VoiceMemory.set('lastCommand', 'weather');
      VoiceMemory.set('lastCity', city);
      VoiceMemory.set('lastCondition', condition);
      VoiceMemory.set('lastTemp', temperature);
    } catch (err) {
      console.log('⚠️ Weather follow-up failed:', err);
    }
    return;
  }

  // ---------------------------
  // 🌦️ Weather command
  // ---------------------------
  if (includesAny(['weather', 'forecast', 'temperature'])) {
    try {
      let lat: number | undefined;
      let lon: number | undefined;

      try {
        const hasPermission = await ensureLocationPermission?.();
        if (hasPermission && global.Geolocation) {
          const position = await new Promise<Geolocation.GeoPosition>(
            (resolve, reject) =>
              Geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 1000,
              }),
          );
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        }
      } catch {
        console.log('⚠️ Geolocation unavailable, falling back to default');
      }

      if (!lat || !lon) {
        lat = 34.05;
        lon = -118.24;
      }

      const weatherResponse = await fetchWeather(lat, lon, 'imperial');
      console.log('✅ Full weather response:', weatherResponse);

      const data = weatherResponse?.fahrenheit;

      const city = data?.name || 'Los Angeles';
      const condition =
        data?.weather?.[0]?.description ||
        data?.description ||
        'Unknown conditions';
      const temperature = Math.round(data?.main?.temp ?? 0);

      console.log('🌡️ Weather overlay emitting (FIXED):', {
        city,
        condition,
        temperature,
      });

      VoiceBus.emit('weather', {
        city,
        temperature,
        condition,
      });

      // 🧠 Save context for follow-up
      VoiceMemory.set('lastCommand', 'weather');
      VoiceMemory.set('lastCity', city);
      VoiceMemory.set('lastCondition', condition);
      VoiceMemory.set('lastTemp', temperature);
    } catch (err) {
      console.log('⚠️ Weather fetch failed:', err);
      VoiceBus.emit('weather', {
        city: 'Los Angeles',
        temperature: 0,
        condition: 'Unable to fetch weather',
      });
    }
    return;
  }

  // ---------------------------
  // ⏰ Outfit reminder command
  // ---------------------------
  if (includesAny(['remind', 'reminder', 'plan my outfit'])) {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      Alert.alert(
        'Reminder set',
        'I’ll remind you to plan your outfit tomorrow at 9:00 AM.',
      );

      try {
        const PushNotification = require('react-native-push-notification');
        PushNotification.localNotificationSchedule({
          channelId: 'stylhelpr-default',
          title: 'Outfit Reminder',
          message: 'Time to plan your outfit for today!',
          date: tomorrow,
          allowWhileIdle: true,
        });
      } catch (err) {
        console.log('⚠️ Local notification fallback failed:', err);
      }
    } catch (err) {
      console.log('⚠️ Reminder scheduling failed:', err);
    }
    return;
  }

  // ---------------------------
  // 🎧 Conversational / fallback
  // ---------------------------
  if (includesAny(['what are you'])) return;
  if (includesAny(['hello', 'hi', 'hey'])) return;

  if (
    lower.startsWith('go to') ||
    lower.startsWith('open') ||
    lower.startsWith('show me') ||
    lower.startsWith('take me to')
  ) {
    const next = lower.replace(/go to|open|show me|take me to/g, '').trim();
    if (next) {
      await routeVoiceCommand(next, navigate);
      return;
    }
  }

  console.log('⚠️ Unrecognized command:', command);
  VoiceBus.emit('voiceCommand', command);
};

/////////////////////

// import {Alert} from 'react-native';
// import Tts from 'react-native-tts';
// import {fetchWeather} from '../travelWeather';
// import {
//   initializeNotifications,
//   scheduleLocalNotification,
// } from '../notificationService';
// import {matchVoiceCommand} from './voiceCommandMap';
// import {VoiceMemory} from './VoiceMemory';
// import {VoiceBus} from './VoiceBus';
// import {instantSpeak} from './instantTts';

// /**
//  * Global voice command router for StylHelpr.
//  * Handles natural navigation phrases and conversational fallbacks.
//  */
// export const routeVoiceCommand = async (
//   command: string,
//   navigate: (screen: string, params?: any) => void,
// ): Promise<void> => {
//   const lower = command.toLowerCase().trim();
//   console.log('🎙️ Routing voice command →', lower);

//   // 🔍 Check the centralized map first
//   if (matchVoiceCommand(lower, navigate)) return;

//   const go = (screen: string, label: string): void => {
//     navigate(screen);
//     // Tts.speak(`Opening ${label}`);
//   };

//   // --- Utility helpers ---
//   const includesAny = (keys: string[]): boolean =>
//     keys.some(k => lower.includes(k));

//   // ---------------------------
//   // 🔹 Navigation Intents
//   // ---------------------------
//   if (includesAny(['login', 'sign in', 'log in'])) return go('Login', 'Login');
//   if (includesAny(['home', 'main'])) return go('Home', 'Home');
//   if (includesAny(['profile', 'account'])) return go('Profile', 'Profile');
//   if (includesAny(['style profile', 'styling profile', 'style settings']))
//     return go('StyleProfileScreen', 'Style Profile');
//   if (includesAny(['fashion news', 'news', 'news stories']))
//     return go('Explore', 'Explore');
//   if (includesAny(['wardrobe', 'closet'])) return go('Wardrobe', 'Wardrobe');
//   if (includesAny(['settings', 'preferences', 'options']))
//     return go('Settings', 'Settings');
//   if (includesAny(['barcode', 'scanner', 'scan']))
//     return go('BarcodeScannerScreen', 'Barcode Scanner');
//   if (includesAny(['measurements', 'sizes', 'fit data']))
//     return go('Measurements', 'Measurements');
//   if (includesAny(['budget', 'brands', 'spending']))
//     return go('BudgetAndBrands', 'Budget and Brands');
//   if (includesAny(['appearance', 'look settings']))
//     return go('Appearance', 'Appearance');
//   if (includesAny(['lifestyle', 'daily life', 'routine']))
//     return go('Lifestyle', 'Lifestyle');
//   if (includesAny(['shopping habits', 'shopping']))
//     return go('ShoppingHabits', 'Shopping Habits');
//   if (includesAny(['style summary', 'summary']))
//     return go('StyleSummary', 'Style Summary');
//   if (includesAny(['activities', 'hobbies']))
//     return go('Activities', 'Activities');
//   if (includesAny(['body types', 'body type']))
//     return go('BodyTypes', 'Body Types');
//   if (includesAny(['climate', 'weather preferences']))
//     return go('Climate', 'Climate');
//   if (includesAny(['color preferences', 'favorite colors']))
//     return go('ColorPreferences', 'Color Preferences');
//   if (includesAny(['eye color'])) return go('EyeColor', 'Eye Color');
//   if (includesAny(['fashion goals', 'style goals']))
//     return go('FashionGoals', 'Fashion Goals');
//   if (includesAny(['fit preferences']))
//     return go('FitPreferences', 'Fit Preferences');
//   if (includesAny(['hair color'])) return go('HairColor', 'Hair Color');
//   if (includesAny(['personality', 'traits']))
//     return go('PersonalityTraits', 'Personality Traits');
//   if (includesAny(['preference strength']))
//     return go('PreferenceStrength', 'Preference Strength');
//   if (includesAny(['proportions', 'body proportions']))
//     return go('Proportions', 'Proportions');
//   if (includesAny(['search', 'find'])) return go('Search', 'Search');
//   if (includesAny(['skin tone', 'complexion']))
//     return go('SkinTone', 'Skin Tone');
//   if (includesAny(['style icon'])) return go('StyleIcon', 'Style Icon');
//   if (includesAny(['voice', 'assistant']))
//     return go('Voice', 'Voice Assistant');
//   if (includesAny(['item detail', 'details']))
//     return go('ItemDetail', 'Item Detail');
//   if (includesAny(['add item', 'add clothing', 'new item']))
//     return go('AddItem', 'Add Item');
//   if (includesAny(['outfit builder', 'build outfit']))
//     return go('OutfitBuilder', 'Outfit Builder');
//   if (includesAny(['style me', 'create outfit'])) return go('Outfit', 'Outfit');
//   if (includesAny(['saved outfits', 'saved looks']))
//     return go('SavedOutfits', 'Saved Outfits');
//   if (includesAny(['try on', 'overlay'])) return go('TryOnOverlay', 'Try On');
//   if (includesAny(['notifications', 'alerts']))
//     return go('Notifications', 'Notifications');
//   if (includesAny(['undertone', 'undertones']))
//     return go('Undertone', 'Undertone');
//   if (includesAny(['style keywords', 'keywords']))
//     return go('StyleKeywords', 'Style Keywords');
//   if (includesAny(['personal information', 'personal info']))
//     return go('PersonalInformation', 'Personal Information');
//   if (includesAny(['contact'])) return go('ContactScreen', 'Contact');
//   if (includesAny(['about', 'about stylhelpr']))
//     return go('AboutScreen', 'About');
//   if (includesAny(['feedback', 'support']))
//     return go('FeedbackScreen', 'Feedback');
//   if (
//     includesAny([
//       'ai stylist',
//       'ai chat',
//       'stylist chat',
//       'chatbot',
//       'assistant',
//       'chat',
//     ])
//   )
//     return go('AiStylistChatScreen', 'AI Stylist Chat');
//   if (includesAny(['recreated look', 'recreate']))
//     return go('RecreatedLook', 'Recreated Look');
//   if (includesAny(['web page', 'browser']))
//     return go('WebPageScreen', 'Web Page');
//   if (includesAny(['planner', 'schedule', 'calendar']))
//     return go('Planner', 'Planner');

//   // ----------------------------
//   // 🧠 Memory-driven commands
//   // ----------------------------
//   if (includesAny(['show me', 'find', 'search'])) {
//     const query = lower
//       .replace(/show me|find|search|for|look for/gi, '')
//       .trim();

//     if (query) VoiceMemory.set('lastItem', query);
//     navigate('RecreatedScreen', {search: query});
//     return;
//   }

//   if (includesAny(['match', 'goes with'])) {
//     const last = VoiceMemory.get('lastItem');
//     if (last) {
//       navigate('SearchScreen', {matchItem: last});
//       return;
//     }
//     Alert.alert('Need Context', 'Try saying “Show me linen shirts” first.');
//     return;
//   }

//   if (includesAny(['forget', 'clear memory'])) {
//     VoiceMemory.clear();
//     Alert.alert('Memory Cleared', 'I forgot your last request.');
//     return;
//   }

//   // 🌦️ Weather command
//   if (includesAny(['weather', 'forecast', 'temperature'])) {
//     try {
//       let lat: number | undefined;
//       let lon: number | undefined;

//       try {
//         const hasPermission = await ensureLocationPermission?.();
//         if (hasPermission && global.Geolocation) {
//           const position = await new Promise<Geolocation.GeoPosition>(
//             (resolve, reject) =>
//               Geolocation.getCurrentPosition(resolve, reject, {
//                 enableHighAccuracy: true,
//                 timeout: 15000,
//                 maximumAge: 1000,
//               }),
//           );
//           lat = position.coords.latitude;
//           lon = position.coords.longitude;
//         }
//       } catch {
//         console.log('⚠️ Geolocation unavailable, falling back to default');
//       }

//       if (!lat || !lon) {
//         lat = 34.05;
//         lon = -118.24;
//       }

//       // ✅ Get the weather result (both metric & imperial)
//       const weatherResponse = await fetchWeather(lat, lon, 'imperial');
//       console.log('✅ Full weather response:', weatherResponse);

//       // ✅ Use the fahrenheit data specifically
//       const data = weatherResponse?.fahrenheit;

//       const city = data?.name || 'Los Angeles';
//       const condition =
//         data?.weather?.[0]?.description ||
//         data?.description ||
//         'Unknown conditions';
//       const temperature = Math.round(data?.main?.temp ?? 0);

//       console.log('🌡️ Weather overlay emitting (FIXED):', {
//         city,
//         condition,
//         temperature,
//       });

//       VoiceBus.emit('weather', {
//         city,
//         temperature,
//         condition,
//       });

//       // 🧠 Save context for follow-up
//       VoiceMemory.set('lastCommand', 'weather');
//       VoiceMemory.set('lastCity', city);
//       VoiceMemory.set('lastCondition', condition);
//       VoiceMemory.set('lastTemp', temperature);

//       // 💬 Gentle follow-up prompt after overlay appears

//       // setTimeout(async () => {
//       //   // Pause listening while TTS speaks
//       //   VoiceBus.emit('stopListening');
//       //   VoiceBus.emit('tts-start');

//       //   await instantSpeak(`Would you like to know tomorrow's forecast too?`);

//       //   // Resume listening once playback ends
//       //   VoiceBus.emit('tts-finish');
//       //   setTimeout(() => VoiceBus.emit('startListening'), 600);
//       // }, 3500);
//     } catch (err) {
//       console.log('⚠️ Weather fetch failed:', err);
//       VoiceBus.emit('weather', {
//         city: 'Los Angeles',
//         temperature: 0,
//         condition: 'Unable to fetch weather',
//       });
//     }
//     return;
//   }

//   // ---------------------------
//   // ⏰ Outfit reminder command
//   // ---------------------------
//   if (includesAny(['remind', 'reminder', 'plan my outfit'])) {
//     try {
//       const tomorrow = new Date();
//       tomorrow.setDate(tomorrow.getDate() + 1);
//       tomorrow.setHours(9, 0, 0, 0);

//       // Simple fallback: just show confirmation
//       Alert.alert(
//         'Reminder set',
//         'I’ll remind you to plan your outfit tomorrow at 9:00 AM.',
//       );

//       // 🔹 Optional local push (works if react-native-push-notification is set up)
//       try {
//         const PushNotification = require('react-native-push-notification');
//         PushNotification.localNotificationSchedule({
//           channelId: 'stylhelpr-default',
//           title: 'Outfit Reminder',
//           message: 'Time to plan your outfit for today!',
//           date: tomorrow,
//           allowWhileIdle: true,
//         });
//       } catch (err) {
//         console.log('⚠️ Local notification fallback failed:', err);
//       }
//     } catch (err) {
//       console.log('⚠️ Reminder scheduling failed:', err);
//       VoiceBus.emit('weather', {
//         city: data?.city || 'Los Angeles',
//         temp: Math.round(temp),
//         summary,
//       });
//     }
//     return;
//   }

//   // ---------------------------
//   // 🎧 Conversational / fallback
//   // ---------------------------
//   if (includesAny(['what are you'])) {
//     // await Tts.speak("I'm your AI stylist — I help you create amazing outfits and stay inspired.");
//     return;
//   }

//   if (includesAny(['hello', 'hi', 'hey'])) {
//     // await Tts.speak('Hey there! What would you like to open?');
//     return;
//   }

//   if (
//     lower.startsWith('go to') ||
//     lower.startsWith('open') ||
//     lower.startsWith('show me') ||
//     lower.startsWith('take me to')
//   ) {
//     const next = lower.replace(/go to|open|show me|take me to/g, '').trim();
//     if (next) {
//       await routeVoiceCommand(next, navigate);
//       return;
//     }
//   }

//   // 🌤️ Auto-context continuation
//   // if (includesAny(['yes', 'sure', 'ok', 'yeah', 'please'])) {
//   //   const last = VoiceMemory.get('lastCommand');
//   //   if (last === 'weather') {
//   //     const city = VoiceMemory.get('lastCity') || 'Los Angeles';
//   //     instantSpeak(
//   //       `Tomorrow in ${city}, expect similar conditions with mild temperatures.`,
//   //     );
//   //     return;
//   //   }
//   // }

//   // ---------------------------
//   // 🪩 Unknown
//   // ---------------------------
//   //   console.log('⚠️ Unrecognized command:', command);
//   // await Tts.speak("I'm not sure what you meant. Try saying, open wardrobe or open saved outfits.");

//   // ---------------------------
//   // 🪩 Unknown Command (Fallback)
//   // ---------------------------
//   console.log('⚠️ Unrecognized command:', command);

//   // 🔊 Broadcast this command globally
//   VoiceBus.emit('voiceCommand', command);
// };

//////////////////////

// import {Alert} from 'react-native';
// import Tts from 'react-native-tts';
// import {fetchWeather} from '../utils/travelWeather';
// import {
//   initializeNotifications,
//   scheduleLocalNotification,
// } from '../utils/notificationService';
// import {matchVoiceCommand} from './voiceCommandMap';
// import {VoiceMemory} from './VoiceMemory';
// import {VoiceBus} from '../utils/VoiceBus';

// /**
//  * Global voice command router for StylHelpr.
//  * Handles natural navigation phrases and conversational fallbacks.
//  */
// export const routeVoiceCommand = async (
//   command: string,
//   navigate: (screen: string, params?: any) => void,
// ): Promise<void> => {
//   const lower = command.toLowerCase().trim();
//   console.log('🎙️ Routing voice command →', lower);

//   // 🔍 Check the centralized map first
//   if (matchVoiceCommand(lower, navigate)) return;

//   const go = (screen: string, label: string): void => {
//     navigate(screen);
//     // Tts.speak(`Opening ${label}`);
//   };

//   // --- Utility helpers ---
//   const includesAny = (keys: string[]): boolean =>
//     keys.some(k => lower.includes(k));

//   // ---------------------------
//   // 🔹 Navigation Intents
//   // ---------------------------
//   if (includesAny(['login', 'sign in', 'log in'])) return go('Login', 'Login');
//   if (includesAny(['home', 'main'])) return go('Home', 'Home');
//   if (includesAny(['profile', 'account'])) return go('Profile', 'Profile');
//   if (includesAny(['style profile', 'styling profile', 'style settings']))
//     return go('StyleProfileScreen', 'Style Profile');
//   if (includesAny(['fashion news', 'news', 'news stories']))
//     return go('Explore', 'Explore');
//   if (includesAny(['wardrobe', 'closet'])) return go('Wardrobe', 'Wardrobe');
//   if (includesAny(['settings', 'preferences', 'options']))
//     return go('Settings', 'Settings');
//   if (includesAny(['barcode', 'scanner', 'scan']))
//     return go('BarcodeScannerScreen', 'Barcode Scanner');
//   if (includesAny(['measurements', 'sizes', 'fit data']))
//     return go('Measurements', 'Measurements');
//   if (includesAny(['budget', 'brands', 'spending']))
//     return go('BudgetAndBrands', 'Budget and Brands');
//   if (includesAny(['appearance', 'look settings']))
//     return go('Appearance', 'Appearance');
//   if (includesAny(['lifestyle', 'daily life', 'routine']))
//     return go('Lifestyle', 'Lifestyle');
//   if (includesAny(['shopping habits', 'shopping']))
//     return go('ShoppingHabits', 'Shopping Habits');
//   if (includesAny(['style summary', 'summary']))
//     return go('StyleSummary', 'Style Summary');
//   if (includesAny(['activities', 'hobbies']))
//     return go('Activities', 'Activities');
//   if (includesAny(['body types', 'body type']))
//     return go('BodyTypes', 'Body Types');
//   if (includesAny(['climate', 'weather preferences']))
//     return go('Climate', 'Climate');
//   if (includesAny(['color preferences', 'favorite colors']))
//     return go('ColorPreferences', 'Color Preferences');
//   if (includesAny(['eye color'])) return go('EyeColor', 'Eye Color');
//   if (includesAny(['fashion goals', 'style goals']))
//     return go('FashionGoals', 'Fashion Goals');
//   if (includesAny(['fit preferences']))
//     return go('FitPreferences', 'Fit Preferences');
//   if (includesAny(['hair color'])) return go('HairColor', 'Hair Color');
//   if (includesAny(['personality', 'traits']))
//     return go('PersonalityTraits', 'Personality Traits');
//   if (includesAny(['preference strength']))
//     return go('PreferenceStrength', 'Preference Strength');
//   if (includesAny(['proportions', 'body proportions']))
//     return go('Proportions', 'Proportions');
//   if (includesAny(['search', 'find'])) return go('Search', 'Search');
//   if (includesAny(['skin tone', 'complexion']))
//     return go('SkinTone', 'Skin Tone');
//   if (includesAny(['style icon'])) return go('StyleIcon', 'Style Icon');
//   if (includesAny(['voice', 'assistant']))
//     return go('Voice', 'Voice Assistant');
//   if (includesAny(['item detail', 'details']))
//     return go('ItemDetail', 'Item Detail');
//   if (includesAny(['add item', 'add clothing', 'new item']))
//     return go('AddItem', 'Add Item');
//   if (includesAny(['outfit builder', 'build outfit']))
//     return go('OutfitBuilder', 'Outfit Builder');
//   if (includesAny(['style me', 'create outfit'])) return go('Outfit', 'Outfit');
//   if (includesAny(['saved outfits', 'saved looks']))
//     return go('SavedOutfits', 'Saved Outfits');
//   if (includesAny(['try on', 'overlay'])) return go('TryOnOverlay', 'Try On');
//   if (includesAny(['notifications', 'alerts']))
//     return go('Notifications', 'Notifications');
//   if (includesAny(['undertone', 'undertones']))
//     return go('Undertone', 'Undertone');
//   if (includesAny(['style keywords', 'keywords']))
//     return go('StyleKeywords', 'Style Keywords');
//   if (includesAny(['personal information', 'personal info']))
//     return go('PersonalInformation', 'Personal Information');
//   if (includesAny(['contact'])) return go('ContactScreen', 'Contact');
//   if (includesAny(['about', 'about stylhelpr']))
//     return go('AboutScreen', 'About');
//   if (includesAny(['feedback', 'support']))
//     return go('FeedbackScreen', 'Feedback');
//   if (
//     includesAny([
//       'ai stylist',
//       'ai chat',
//       'stylist chat',
//       'chatbot',
//       'assistant',
//       'chat',
//     ])
//   )
//     return go('AiStylistChatScreen', 'AI Stylist Chat');
//   if (includesAny(['recreated look', 'recreate']))
//     return go('RecreatedLook', 'Recreated Look');
//   if (includesAny(['web page', 'browser']))
//     return go('WebPageScreen', 'Web Page');
//   if (includesAny(['planner', 'schedule', 'calendar']))
//     return go('Planner', 'Planner');

//   // ----------------------------
//   // 🧠 Memory-driven commands
//   // ----------------------------
//   if (includesAny(['show me', 'find', 'search'])) {
//     const query = lower
//       .replace(/show me|find|search|for|look for/gi, '')
//       .trim();

//     if (query) VoiceMemory.set('lastItem', query);
//     navigate('RecreatedScreen', {search: query});
//     return;
//   }

//   if (includesAny(['match', 'goes with'])) {
//     const last = VoiceMemory.get('lastItem');
//     if (last) {
//       navigate('SearchScreen', {matchItem: last});
//       return;
//     }
//     Alert.alert('Need Context', 'Try saying “Show me linen shirts” first.');
//     return;
//   }

//   if (includesAny(['forget', 'clear memory'])) {
//     VoiceMemory.clear();
//     Alert.alert('Memory Cleared', 'I forgot your last request.');
//     return;
//   }

//   // 🌦️ Weather command
//   if (includesAny(['weather', 'forecast', 'temperature'])) {
//     try {
//       let lat: number | undefined;
//       let lon: number | undefined;

//       try {
//         const hasPermission = await ensureLocationPermission?.();
//         if (hasPermission && global.Geolocation) {
//           const position = await new Promise<Geolocation.GeoPosition>(
//             (resolve, reject) =>
//               Geolocation.getCurrentPosition(resolve, reject, {
//                 enableHighAccuracy: true,
//                 timeout: 15000,
//                 maximumAge: 1000,
//               }),
//           );
//           lat = position.coords.latitude;
//           lon = position.coords.longitude;
//         }
//       } catch {
//         console.log('⚠️ Geolocation unavailable, falling back to default');
//       }

//       if (!lat || !lon) {
//         lat = 34.05;
//         lon = -118.24;
//       }

//       // ✅ Get the weather result (both metric & imperial)
//       const weatherResponse = await fetchWeather(lat, lon, 'imperial');
//       console.log('✅ Full weather response:', weatherResponse);

//       // ✅ Use the fahrenheit data specifically
//       const data = weatherResponse?.fahrenheit;

//       const city = data?.name || 'Los Angeles';
//       const condition =
//         data?.weather?.[0]?.description ||
//         data?.description ||
//         'Unknown conditions';
//       const temperature = Math.round(data?.main?.temp ?? 0);

//       console.log('🌡️ Weather overlay emitting (FIXED):', {
//         city,
//         condition,
//         temperature,
//       });

//       VoiceBus.emit('weather', {
//         city,
//         temperature,
//         condition,
//       });
//     } catch (err) {
//       console.log('⚠️ Weather fetch failed:', err);
//       VoiceBus.emit('weather', {
//         city: 'Los Angeles',
//         temperature: 0,
//         condition: 'Unable to fetch weather',
//       });
//     }
//     return;
//   }

//   // ---------------------------
//   // ⏰ Outfit reminder command
//   // ---------------------------
//   if (includesAny(['remind', 'reminder', 'plan my outfit'])) {
//     try {
//       const tomorrow = new Date();
//       tomorrow.setDate(tomorrow.getDate() + 1);
//       tomorrow.setHours(9, 0, 0, 0);

//       // Simple fallback: just show confirmation
//       Alert.alert(
//         'Reminder set',
//         'I’ll remind you to plan your outfit tomorrow at 9:00 AM.',
//       );

//       // 🔹 Optional local push (works if react-native-push-notification is set up)
//       try {
//         const PushNotification = require('react-native-push-notification');
//         PushNotification.localNotificationSchedule({
//           channelId: 'stylhelpr-default',
//           title: 'Outfit Reminder',
//           message: 'Time to plan your outfit for today!',
//           date: tomorrow,
//           allowWhileIdle: true,
//         });
//       } catch (err) {
//         console.log('⚠️ Local notification fallback failed:', err);
//       }
//     } catch (err) {
//       console.log('⚠️ Reminder scheduling failed:', err);
//       VoiceBus.emit('weather', {
//         city: data?.city || 'Los Angeles',
//         temp: Math.round(temp),
//         summary,
//       });
//     }
//     return;
//   }

//   // ---------------------------
//   // 🎧 Conversational / fallback
//   // ---------------------------
//   if (includesAny(['what are you'])) {
//     // await Tts.speak("I'm your AI stylist — I help you create amazing outfits and stay inspired.");
//     return;
//   }

//   if (includesAny(['hello', 'hi', 'hey'])) {
//     // await Tts.speak('Hey there! What would you like to open?');
//     return;
//   }

//   if (
//     lower.startsWith('go to') ||
//     lower.startsWith('open') ||
//     lower.startsWith('show me') ||
//     lower.startsWith('take me to')
//   ) {
//     const next = lower.replace(/go to|open|show me|take me to/g, '').trim();
//     if (next) {
//       await routeVoiceCommand(next, navigate);
//       return;
//     }
//   }

//   // ---------------------------
//   // 🪩 Unknown
//   // ---------------------------
//   //   console.log('⚠️ Unrecognized command:', command);
//   // await Tts.speak("I'm not sure what you meant. Try saying, open wardrobe or open saved outfits.");

//   // ---------------------------
//   // 🪩 Unknown Command (Fallback)
//   // ---------------------------
//   console.log('⚠️ Unrecognized command:', command);

//   // 🔊 Broadcast this command globally
//   VoiceBus.emit('voiceCommand', command);
// };

////////////////////////

// import {Alert} from 'react-native';
// import Tts from 'react-native-tts';
// import {fetchWeather} from '../utils/travelWeather';
// import {
//   initializeNotifications,
//   scheduleLocalNotification,
// } from '../utils/notificationService';
// import {matchVoiceCommand} from './voiceCommandMap';
// import {VoiceMemory} from './VoiceMemory';
// import {VoiceBus} from '../utils/VoiceBus';

// /**
//  * Global voice command router for StylHelpr.
//  * Handles natural navigation phrases and conversational fallbacks.
//  */
// export const routeVoiceCommand = async (
//   command: string,
//   navigate: (screen: string, params?: any) => void,
// ): Promise<void> => {
//   const lower = command.toLowerCase().trim();
//   console.log('🎙️ Routing voice command →', lower);

//   // 🔍 Check the centralized map first
//   if (matchVoiceCommand(lower, navigate)) return;

//   const go = (screen: string, label: string): void => {
//     navigate(screen);
//     // Tts.speak(`Opening ${label}`);
//   };

//   // --- Utility helpers ---
//   const includesAny = (keys: string[]): boolean =>
//     keys.some(k => lower.includes(k));

//   // ---------------------------
//   // 🔹 Navigation Intents
//   // ---------------------------
//   if (includesAny(['login', 'sign in', 'log in'])) return go('Login', 'Login');
//   if (includesAny(['home', 'main'])) return go('Home', 'Home');
//   if (includesAny(['profile', 'account'])) return go('Profile', 'Profile');
//   if (includesAny(['style profile', 'styling profile', 'style settings']))
//     return go('StyleProfileScreen', 'Style Profile');
//   if (includesAny(['fashion news', 'news', 'news stories']))
//     return go('Explore', 'Explore');
//   if (includesAny(['wardrobe', 'closet'])) return go('Wardrobe', 'Wardrobe');
//   if (includesAny(['settings', 'preferences', 'options']))
//     return go('Settings', 'Settings');
//   if (includesAny(['barcode', 'scanner', 'scan']))
//     return go('BarcodeScannerScreen', 'Barcode Scanner');
//   if (includesAny(['measurements', 'sizes', 'fit data']))
//     return go('Measurements', 'Measurements');
//   if (includesAny(['budget', 'brands', 'spending']))
//     return go('BudgetAndBrands', 'Budget and Brands');
//   if (includesAny(['appearance', 'look settings']))
//     return go('Appearance', 'Appearance');
//   if (includesAny(['lifestyle', 'daily life', 'routine']))
//     return go('Lifestyle', 'Lifestyle');
//   if (includesAny(['shopping habits', 'shopping']))
//     return go('ShoppingHabits', 'Shopping Habits');
//   if (includesAny(['style summary', 'summary']))
//     return go('StyleSummary', 'Style Summary');
//   if (includesAny(['activities', 'hobbies']))
//     return go('Activities', 'Activities');
//   if (includesAny(['body types', 'body type']))
//     return go('BodyTypes', 'Body Types');
//   if (includesAny(['climate', 'weather preferences']))
//     return go('Climate', 'Climate');
//   if (includesAny(['color preferences', 'favorite colors']))
//     return go('ColorPreferences', 'Color Preferences');
//   if (includesAny(['eye color'])) return go('EyeColor', 'Eye Color');
//   if (includesAny(['fashion goals', 'style goals']))
//     return go('FashionGoals', 'Fashion Goals');
//   if (includesAny(['fit preferences']))
//     return go('FitPreferences', 'Fit Preferences');
//   if (includesAny(['hair color'])) return go('HairColor', 'Hair Color');
//   if (includesAny(['personality', 'traits']))
//     return go('PersonalityTraits', 'Personality Traits');
//   if (includesAny(['preference strength']))
//     return go('PreferenceStrength', 'Preference Strength');
//   if (includesAny(['proportions', 'body proportions']))
//     return go('Proportions', 'Proportions');
//   if (includesAny(['search', 'find'])) return go('Search', 'Search');
//   if (includesAny(['skin tone', 'complexion']))
//     return go('SkinTone', 'Skin Tone');
//   if (includesAny(['style icon'])) return go('StyleIcon', 'Style Icon');
//   if (includesAny(['voice', 'assistant']))
//     return go('Voice', 'Voice Assistant');
//   if (includesAny(['item detail', 'details']))
//     return go('ItemDetail', 'Item Detail');
//   if (includesAny(['add item', 'add clothing', 'new item']))
//     return go('AddItem', 'Add Item');
//   if (includesAny(['outfit builder', 'build outfit']))
//     return go('OutfitBuilder', 'Outfit Builder');
//   if (includesAny(['style me', 'create outfit'])) return go('Outfit', 'Outfit');
//   if (includesAny(['saved outfits', 'saved looks']))
//     return go('SavedOutfits', 'Saved Outfits');
//   if (includesAny(['try on', 'overlay'])) return go('TryOnOverlay', 'Try On');
//   if (includesAny(['notifications', 'alerts']))
//     return go('Notifications', 'Notifications');
//   if (includesAny(['undertone', 'undertones']))
//     return go('Undertone', 'Undertone');
//   if (includesAny(['style keywords', 'keywords']))
//     return go('StyleKeywords', 'Style Keywords');
//   if (includesAny(['personal information', 'personal info']))
//     return go('PersonalInformation', 'Personal Information');
//   if (includesAny(['contact'])) return go('ContactScreen', 'Contact');
//   if (includesAny(['about', 'about stylhelpr']))
//     return go('AboutScreen', 'About');
//   if (includesAny(['feedback', 'support']))
//     return go('FeedbackScreen', 'Feedback');
//   if (
//     includesAny([
//       'ai stylist',
//       'ai chat',
//       'stylist chat',
//       'chatbot',
//       'assistant',
//       'chat',
//     ])
//   )
//     return go('AiStylistChatScreen', 'AI Stylist Chat');
//   if (includesAny(['recreated look', 'recreate']))
//     return go('RecreatedLook', 'Recreated Look');
//   if (includesAny(['web page', 'browser']))
//     return go('WebPageScreen', 'Web Page');
//   if (includesAny(['planner', 'schedule', 'calendar']))
//     return go('Planner', 'Planner');

//   // ----------------------------
//   // 🧠 Memory-driven commands
//   // ----------------------------
//   if (includesAny(['show me', 'find', 'search'])) {
//     const query = lower
//       .replace(/show me|find|search|for|look for/gi, '')
//       .trim();

//     if (query) VoiceMemory.set('lastItem', query);
//     navigate('RecreatedScreen', {search: query});
//     return;
//   }

//   if (includesAny(['match', 'goes with'])) {
//     const last = VoiceMemory.get('lastItem');
//     if (last) {
//       navigate('SearchScreen', {matchItem: last});
//       return;
//     }
//     Alert.alert('Need Context', 'Try saying “Show me linen shirts” first.');
//     return;
//   }

//   if (includesAny(['forget', 'clear memory'])) {
//     VoiceMemory.clear();
//     Alert.alert('Memory Cleared', 'I forgot your last request.');
//     return;
//   }

//   // ---------------------------
//   // 🌦️ Weather command
//   // ---------------------------
//   if (includesAny(['weather', 'forecast', 'temperature'])) {
//     try {
//       // Try to get live coordinates first
//       let lat: number | undefined;
//       let lon: number | undefined;

//       try {
//         const hasPermission = await ensureLocationPermission();
//         if (hasPermission) {
//           const position = await new Promise<Geolocation.GeoPosition>(
//             (resolve, reject) =>
//               Geolocation.getCurrentPosition(resolve, reject, {
//                 enableHighAccuracy: true,
//                 timeout: 15000,
//                 maximumAge: 1000,
//               }),
//           );
//           lat = position.coords.latitude;
//           lon = position.coords.longitude;
//         }
//       } catch (e) {
//         console.log('⚠️ Geolocation unavailable, falling back to default');
//       }

//       // If still undefined, fallback to LA (prevents 400 errors)
//       if (!lat || !lon) {
//         lat = 34.05;
//         lon = -118.24;
//       }

//       // Fetch weather with valid coordinates
//       const data = await fetchWeather(lat, lon);
//       const summary =
//         data?.description ||
//         data?.weather ||
//         data?.weather?.[0]?.description ||
//         'Clear skies';
//       const temp = data?.temperature || data?.temp || '--';

//       Alert.alert('Current Weather', `${summary}\n${Math.round(temp)}°`);
//     } catch (err) {
//       console.log('⚠️ Weather fetch failed:', err);
//       Alert.alert('Weather', 'Unable to retrieve weather right now.');
//     }
//     return;
//   }

//   // ---------------------------
//   // ⏰ Outfit reminder command
//   // ---------------------------
//   if (includesAny(['remind', 'reminder', 'plan my outfit'])) {
//     try {
//       const tomorrow = new Date();
//       tomorrow.setDate(tomorrow.getDate() + 1);
//       tomorrow.setHours(9, 0, 0, 0);

//       // Simple fallback: just show confirmation
//       Alert.alert(
//         'Reminder set',
//         'I’ll remind you to plan your outfit tomorrow at 9:00 AM.',
//       );

//       // 🔹 Optional local push (works if react-native-push-notification is set up)
//       try {
//         const PushNotification = require('react-native-push-notification');
//         PushNotification.localNotificationSchedule({
//           channelId: 'stylhelpr-default',
//           title: 'Outfit Reminder',
//           message: 'Time to plan your outfit for today!',
//           date: tomorrow,
//           allowWhileIdle: true,
//         });
//       } catch (err) {
//         console.log('⚠️ Local notification fallback failed:', err);
//       }
//     } catch (err) {
//       console.log('⚠️ Reminder scheduling failed:', err);
//       Alert.alert('Reminder', 'Failed to schedule outfit reminder.');
//     }
//     return;
//   }

//   // ---------------------------
//   // 🎧 Conversational / fallback
//   // ---------------------------
//   if (includesAny(['what are you'])) {
//     // await Tts.speak("I'm your AI stylist — I help you create amazing outfits and stay inspired.");
//     return;
//   }

//   if (includesAny(['hello', 'hi', 'hey'])) {
//     // await Tts.speak('Hey there! What would you like to open?');
//     return;
//   }

//   if (
//     lower.startsWith('go to') ||
//     lower.startsWith('open') ||
//     lower.startsWith('show me') ||
//     lower.startsWith('take me to')
//   ) {
//     const next = lower.replace(/go to|open|show me|take me to/g, '').trim();
//     if (next) {
//       await routeVoiceCommand(next, navigate);
//       return;
//     }
//   }

//   // ---------------------------
//   // 🪩 Unknown
//   // ---------------------------
//   //   console.log('⚠️ Unrecognized command:', command);
//   // await Tts.speak("I'm not sure what you meant. Try saying, open wardrobe or open saved outfits.");

//   // ---------------------------
//   // 🪩 Unknown Command (Fallback)
//   // ---------------------------
//   console.log('⚠️ Unrecognized command:', command);

//   // 🔊 Broadcast this command globally
//   VoiceBus.emit('voiceCommand', command);
// };

//////////////////////

// import {Alert} from 'react-native';
// import Tts from 'react-native-tts';
// import {fetchWeather} from '../utils/travelWeather';
// import {
//   initializeNotifications,
//   scheduleLocalNotification,
// } from '../utils/notificationService';
// import {matchVoiceCommand} from './voiceCommandMap';

// /**
//  * Global voice command router for StylHelpr.
//  * Handles natural navigation phrases and conversational fallbacks.
//  */
// export const routeVoiceCommand = async (
//   command: string,
//   navigate: (screen: string, params?: any) => void,
// ): Promise<void> => {
//   const lower = command.toLowerCase().trim();
//   console.log('🎙️ Routing voice command →', lower);

//   // 🔍 Check the centralized map first
//   if (matchVoiceCommand(lower, navigate)) return;

//   const go = (screen: string, label: string): void => {
//     navigate(screen);
//     // Tts.speak(`Opening ${label}`);
//   };

//   // --- Utility helpers ---
//   const includesAny = (keys: string[]): boolean =>
//     keys.some(k => lower.includes(k));

//   // ---------------------------
//   // 🔹 Navigation Intents
//   // ---------------------------
//   if (includesAny(['login', 'sign in', 'log in'])) return go('Login', 'Login');
//   if (includesAny(['home', 'main'])) return go('Home', 'Home');
//   if (includesAny(['profile', 'account'])) return go('Profile', 'Profile');
//   if (includesAny(['style profile', 'styling profile', 'style settings']))
//     return go('StyleProfileScreen', 'Style Profile');
//   if (includesAny(['fashion news', 'news', 'news stories']))
//     return go('Explore', 'Explore');
//   if (includesAny(['wardrobe', 'closet'])) return go('Wardrobe', 'Wardrobe');
//   if (includesAny(['settings', 'preferences', 'options']))
//     return go('Settings', 'Settings');
//   if (includesAny(['barcode', 'scanner', 'scan']))
//     return go('BarcodeScannerScreen', 'Barcode Scanner');
//   if (includesAny(['measurements', 'sizes', 'fit data']))
//     return go('Measurements', 'Measurements');
//   if (includesAny(['budget', 'brands', 'spending']))
//     return go('BudgetAndBrands', 'Budget and Brands');
//   if (includesAny(['appearance', 'look settings']))
//     return go('Appearance', 'Appearance');
//   if (includesAny(['lifestyle', 'daily life', 'routine']))
//     return go('Lifestyle', 'Lifestyle');
//   if (includesAny(['shopping habits', 'shopping']))
//     return go('ShoppingHabits', 'Shopping Habits');
//   if (includesAny(['style summary', 'summary']))
//     return go('StyleSummary', 'Style Summary');
//   if (includesAny(['activities', 'hobbies']))
//     return go('Activities', 'Activities');
//   if (includesAny(['body types', 'body type']))
//     return go('BodyTypes', 'Body Types');
//   if (includesAny(['climate', 'weather preferences']))
//     return go('Climate', 'Climate');
//   if (includesAny(['color preferences', 'favorite colors']))
//     return go('ColorPreferences', 'Color Preferences');
//   if (includesAny(['eye color'])) return go('EyeColor', 'Eye Color');
//   if (includesAny(['fashion goals', 'style goals']))
//     return go('FashionGoals', 'Fashion Goals');
//   if (includesAny(['fit preferences']))
//     return go('FitPreferences', 'Fit Preferences');
//   if (includesAny(['hair color'])) return go('HairColor', 'Hair Color');
//   if (includesAny(['personality', 'traits']))
//     return go('PersonalityTraits', 'Personality Traits');
//   if (includesAny(['preference strength']))
//     return go('PreferenceStrength', 'Preference Strength');
//   if (includesAny(['proportions', 'body proportions']))
//     return go('Proportions', 'Proportions');
//   if (includesAny(['search', 'find'])) return go('SearchScreen', 'Search');
//   if (includesAny(['skin tone', 'complexion']))
//     return go('SkinTone', 'Skin Tone');
//   if (includesAny(['style icon'])) return go('StyleIcon', 'Style Icon');
//   if (includesAny(['voice', 'assistant']))
//     return go('Voice', 'Voice Assistant');
//   if (includesAny(['item detail', 'details']))
//     return go('ItemDetail', 'Item Detail');
//   if (includesAny(['add item', 'add clothing', 'new item']))
//     return go('AddItem', 'Add Item');
//   if (includesAny(['outfit builder']))
//     return go('OutfitBuilder', 'Outfit Builder');
//   if (includesAny(['style me', 'create outfit'])) return go('Outfit', 'Outfit');
//   if (includesAny(['saved outfits', 'saved looks']))
//     return go('SavedOutfits', 'Saved Outfits');
//   if (includesAny(['try on', 'overlay'])) return go('TryOnOverlay', 'Try On');
//   if (includesAny(['notifications', 'alerts']))
//     return go('Notifications', 'Notifications');
//   if (includesAny(['undertone', 'undertones']))
//     return go('Undertone', 'Undertone');
//   if (includesAny(['style keywords', 'keywords']))
//     return go('StyleKeywords', 'Style Keywords');
//   if (includesAny(['personal information', 'personal info']))
//     return go('PersonalInformation', 'Personal Information');
//   if (includesAny(['contact'])) return go('ContactScreen', 'Contact');
//   if (includesAny(['about', 'about stylhelpr']))
//     return go('AboutScreen', 'About');
//   if (includesAny(['feedback', 'support']))
//     return go('FeedbackScreen', 'Feedback');
//   if (
//     includesAny([
//       'ai stylist',
//       'ai chat',
//       'stylist chat',
//       'chatbot',
//       'assistant',
//       'chat',
//     ])
//   )
//     return go('AiStylistChatScreen', 'AI Stylist Chat');
//   if (includesAny(['recreated look', 'recreate']))
//     return go('RecreatedLook', 'Recreated Look');
//   if (includesAny(['web page', 'browser']))
//     return go('WebPageScreen', 'Web Page');
//   if (includesAny(['planner', 'schedule', 'calendar']))
//     return go('Planner', 'Planner');

//   // ---------------------------
//   // 🌦️ Weather command
//   // ---------------------------
//   if (includesAny(['weather', 'forecast', 'temperature'])) {
//     try {
//       // Try to get live coordinates first
//       let lat: number | undefined;
//       let lon: number | undefined;

//       try {
//         const hasPermission = await ensureLocationPermission();
//         if (hasPermission) {
//           const position = await new Promise<Geolocation.GeoPosition>(
//             (resolve, reject) =>
//               Geolocation.getCurrentPosition(resolve, reject, {
//                 enableHighAccuracy: true,
//                 timeout: 15000,
//                 maximumAge: 1000,
//               }),
//           );
//           lat = position.coords.latitude;
//           lon = position.coords.longitude;
//         }
//       } catch (e) {
//         console.log('⚠️ Geolocation unavailable, falling back to default');
//       }

//       // If still undefined, fallback to LA (prevents 400 errors)
//       if (!lat || !lon) {
//         lat = 34.05;
//         lon = -118.24;
//       }

//       // Fetch weather with valid coordinates
//       const data = await fetchWeather(lat, lon);
//       const summary =
//         data?.description ||
//         data?.weather ||
//         data?.weather?.[0]?.description ||
//         'Clear skies';
//       const temp = data?.temperature || data?.temp || '--';

//       Alert.alert('Current Weather', `${summary}\n${Math.round(temp)}°`);
//     } catch (err) {
//       console.log('⚠️ Weather fetch failed:', err);
//       Alert.alert('Weather', 'Unable to retrieve weather right now.');
//     }
//     return;
//   }

//   // ---------------------------
//   // ⏰ Outfit reminder command
//   // ---------------------------
//   if (includesAny(['remind', 'reminder', 'plan my outfit'])) {
//     try {
//       const tomorrow = new Date();
//       tomorrow.setDate(tomorrow.getDate() + 1);
//       tomorrow.setHours(9, 0, 0, 0);

//       // Simple fallback: just show confirmation
//       Alert.alert(
//         'Reminder set',
//         'I’ll remind you to plan your outfit tomorrow at 9:00 AM.',
//       );

//       // 🔹 Optional local push (works if react-native-push-notification is set up)
//       try {
//         const PushNotification = require('react-native-push-notification');
//         PushNotification.localNotificationSchedule({
//           channelId: 'stylhelpr-default',
//           title: 'Outfit Reminder',
//           message: 'Time to plan your outfit for today!',
//           date: tomorrow,
//           allowWhileIdle: true,
//         });
//       } catch (err) {
//         console.log('⚠️ Local notification fallback failed:', err);
//       }
//     } catch (err) {
//       console.log('⚠️ Reminder scheduling failed:', err);
//       Alert.alert('Reminder', 'Failed to schedule outfit reminder.');
//     }
//     return;
//   }

//   // ---------------------------
//   // 🎧 Conversational / fallback
//   // ---------------------------
//   if (includesAny(['what are you'])) {
//     // await Tts.speak("I'm your AI stylist — I help you create amazing outfits and stay inspired.");
//     return;
//   }

//   if (includesAny(['hello', 'hi', 'hey'])) {
//     // await Tts.speak('Hey there! What would you like to open?');
//     return;
//   }

//   if (
//     lower.startsWith('go to') ||
//     lower.startsWith('open') ||
//     lower.startsWith('show me') ||
//     lower.startsWith('take me to')
//   ) {
//     const next = lower.replace(/go to|open|show me|take me to/g, '').trim();
//     if (next) {
//       await routeVoiceCommand(next, navigate);
//       return;
//     }
//   }

//   // ---------------------------
//   // 🪩 Unknown
//   // ---------------------------
//   console.log('⚠️ Unrecognized command:', command);
//   // await Tts.speak("I'm not sure what you meant. Try saying, open wardrobe or open saved outfits.");
// };

////////////////////////

// import {Alert} from 'react-native';
// import Tts from 'react-native-tts';
// import {fetchWeather} from '../utils/travelWeather';
// import {
//   initializeNotifications,
//   scheduleLocalNotification,
// } from '../utils/notificationService';

// /**
//  * Global voice command router for StylHelpr.
//  * Handles natural navigation phrases and conversational fallbacks.
//  */
// export const routeVoiceCommand = async (
//   command: string,
//   navigate: (screen: string) => void,
// ): Promise<void> => {
//   const lower = command.toLowerCase().trim();
//   console.log('🎙️ Routing voice command →', lower);

//   const go = (screen: string, label: string): void => {
//     navigate(screen);
//     // Tts.speak(`Opening ${label}`);
//   };

//   // --- Utility helpers ---
//   const includesAny = (keys: string[]): boolean =>
//     keys.some(k => lower.includes(k));

//   // ---------------------------
//   // 🔹 Navigation Intents
//   // ---------------------------
//   if (includesAny(['login', 'sign in', 'log in'])) return go('Login', 'Login');
//   if (includesAny(['home', 'main'])) return go('Home', 'Home');
//   if (includesAny(['profile', 'account'])) return go('Profile', 'Profile');
//   if (includesAny(['style profile', 'styling profile', 'style settings']))
//     return go('StyleProfileScreen', 'Style Profile');
//   if (includesAny(['explore', 'trends', 'discover']))
//     return go('Explore', 'Explore');
//   if (includesAny(['wardrobe', 'closet'])) return go('Wardrobe', 'Wardrobe');
//   if (includesAny(['settings', 'preferences', 'options']))
//     return go('Settings', 'Settings');
//   if (includesAny(['barcode', 'scanner', 'scan']))
//     return go('BarcodeScannerScreen', 'Barcode Scanner');
//   if (includesAny(['measurements', 'sizes', 'fit data']))
//     return go('Measurements', 'Measurements');
//   if (includesAny(['budget', 'brands', 'spending']))
//     return go('BudgetAndBrands', 'Budget and Brands');
//   if (includesAny(['appearance', 'look settings']))
//     return go('Appearance', 'Appearance');
//   if (includesAny(['lifestyle', 'daily life', 'routine']))
//     return go('Lifestyle', 'Lifestyle');
//   if (includesAny(['shopping habits', 'shopping']))
//     return go('ShoppingHabits', 'Shopping Habits');
//   if (includesAny(['style summary', 'summary']))
//     return go('StyleSummary', 'Style Summary');
//   if (includesAny(['activities', 'hobbies']))
//     return go('Activities', 'Activities');
//   if (includesAny(['body types', 'body type']))
//     return go('BodyTypes', 'Body Types');
//   if (includesAny(['climate', 'weather preferences']))
//     return go('Climate', 'Climate');
//   if (includesAny(['color preferences', 'favorite colors']))
//     return go('ColorPreferences', 'Color Preferences');
//   if (includesAny(['eye color'])) return go('EyeColor', 'Eye Color');
//   if (includesAny(['fashion goals', 'style goals']))
//     return go('FashionGoals', 'Fashion Goals');
//   if (includesAny(['fit preferences']))
//     return go('FitPreferences', 'Fit Preferences');
//   if (includesAny(['hair color'])) return go('HairColor', 'Hair Color');
//   if (includesAny(['personality', 'traits']))
//     return go('PersonalityTraits', 'Personality Traits');
//   if (includesAny(['preference strength']))
//     return go('PreferenceStrength', 'Preference Strength');
//   if (includesAny(['proportions', 'body proportions']))
//     return go('Proportions', 'Proportions');
//   if (includesAny(['search', 'find'])) return go('SearchScreen', 'Search');
//   if (includesAny(['skin tone', 'complexion']))
//     return go('SkinTone', 'Skin Tone');
//   if (includesAny(['style icon'])) return go('StyleIcon', 'Style Icon');
//   if (includesAny(['voice', 'assistant']))
//     return go('Voice', 'Voice Assistant');
//   if (includesAny(['item detail', 'details']))
//     return go('ItemDetail', 'Item Detail');
//   if (includesAny(['add item', 'add clothing', 'new item']))
//     return go('AddItem', 'Add Item');
//   if (includesAny(['outfit builder', 'create outfit']))
//     return go('OutfitBuilder', 'Outfit Builder');
//   if (includesAny(['saved outfits', 'saved looks']))
//     return go('SavedOutfits', 'Saved Outfits');
//   if (includesAny(['try on', 'overlay'])) return go('TryOnOverlay', 'Try On');
//   if (includesAny(['notifications', 'alerts']))
//     return go('Notifications', 'Notifications');
//   if (includesAny(['undertone', 'undertones']))
//     return go('Undertone', 'Undertone');
//   if (includesAny(['style keywords', 'keywords']))
//     return go('StyleKeywords', 'Style Keywords');
//   if (includesAny(['onboarding', 'setup']))
//     return go('Onboarding', 'Onboarding');
//   if (includesAny(['personal information', 'personal info']))
//     return go('PersonalInformation', 'Personal Information');
//   if (includesAny(['contact'])) return go('ContactScreen', 'Contact');
//   if (includesAny(['about', 'about stylhelpr']))
//     return go('AboutScreen', 'About');
//   if (includesAny(['feedback', 'support']))
//     return go('FeedbackScreen', 'Feedback');
//   if (
//     includesAny([
//       'ai stylist',
//       'ai chat',
//       'stylist chat',
//       'chatbot',
//       'assistant',
//     ])
//   )
//     return go('AiStylistChatScreen', 'AI Stylist Chat');
//   if (includesAny(['recreated look', 'recreate']))
//     return go('RecreatedLook', 'Recreated Look');
//   if (includesAny(['web page', 'browser']))
//     return go('WebPageScreen', 'Web Page');
//   if (includesAny(['planner', 'schedule', 'calendar']))
//     return go('Planner', 'Planner');

//   // ---------------------------
//   // 🌦️ Weather command
//   // ---------------------------
//   if (includesAny(['weather', 'forecast', 'temperature'])) {
//     try {
//       // Try to get live coordinates first
//       let lat: number | undefined;
//       let lon: number | undefined;

//       try {
//         const hasPermission = await ensureLocationPermission();
//         if (hasPermission) {
//           const position = await new Promise<Geolocation.GeoPosition>(
//             (resolve, reject) =>
//               Geolocation.getCurrentPosition(resolve, reject, {
//                 enableHighAccuracy: true,
//                 timeout: 15000,
//                 maximumAge: 1000,
//               }),
//           );
//           lat = position.coords.latitude;
//           lon = position.coords.longitude;
//         }
//       } catch (e) {
//         console.log('⚠️ Geolocation unavailable, falling back to default');
//       }

//       // If still undefined, fallback to LA (prevents 400 errors)
//       if (!lat || !lon) {
//         lat = 34.05;
//         lon = -118.24;
//       }

//       // Fetch weather with valid coordinates
//       const data = await fetchWeather(lat, lon);
//       const summary =
//         data?.description ||
//         data?.weather ||
//         data?.weather?.[0]?.description ||
//         'Clear skies';
//       const temp = data?.temperature || data?.temp || '--';

//       Alert.alert('Current Weather', `${summary}\n${Math.round(temp)}°`);
//     } catch (err) {
//       console.log('⚠️ Weather fetch failed:', err);
//       Alert.alert('Weather', 'Unable to retrieve weather right now.');
//     }
//     return;
//   }

//   // ---------------------------
//   // ⏰ Outfit reminder command
//   // ---------------------------
//   if (includesAny(['remind', 'reminder', 'plan my outfit'])) {
//     try {
//       const tomorrow = new Date();
//       tomorrow.setDate(tomorrow.getDate() + 1);
//       tomorrow.setHours(9, 0, 0, 0);

//       // Simple fallback: just show confirmation
//       Alert.alert(
//         'Reminder set',
//         'I’ll remind you to plan your outfit tomorrow at 9:00 AM.',
//       );

//       // 🔹 Optional local push (works if react-native-push-notification is set up)
//       try {
//         const PushNotification = require('react-native-push-notification');
//         PushNotification.localNotificationSchedule({
//           channelId: 'stylhelpr-default',
//           title: 'Outfit Reminder',
//           message: 'Time to plan your outfit for today!',
//           date: tomorrow,
//           allowWhileIdle: true,
//         });
//       } catch (err) {
//         console.log('⚠️ Local notification fallback failed:', err);
//       }
//     } catch (err) {
//       console.log('⚠️ Reminder scheduling failed:', err);
//       Alert.alert('Reminder', 'Failed to schedule outfit reminder.');
//     }
//     return;
//   }

//   // ---------------------------
//   // 🎧 Conversational / fallback
//   // ---------------------------
//   if (includesAny(['what are you'])) {
//     // await Tts.speak("I'm your AI stylist — I help you create amazing outfits and stay inspired.");
//     return;
//   }

//   if (includesAny(['hello', 'hi', 'hey'])) {
//     // await Tts.speak('Hey there! What would you like to open?');
//     return;
//   }

//   if (
//     lower.startsWith('go to') ||
//     lower.startsWith('open') ||
//     lower.startsWith('show me') ||
//     lower.startsWith('take me to')
//   ) {
//     const next = lower.replace(/go to|open|show me|take me to/g, '').trim();
//     if (next) {
//       await routeVoiceCommand(next, navigate);
//       return;
//     }
//   }

//   // ---------------------------
//   // 🪩 Unknown
//   // ---------------------------
//   console.log('⚠️ Unrecognized command:', command);
//   // await Tts.speak("I'm not sure what you meant. Try saying, open wardrobe or open saved outfits.");
// };

////////////////////////

// import {Alert} from 'react-native';
// import Tts from 'react-native-tts';
// import {fetchWeather} from '../utils/travelWeather';
// import {
//   initializeNotifications,
//   scheduleLocalNotification,
// } from '../utils/notificationService';

// /**
//  * Global voice command router for StylHelpr.
//  * Handles natural navigation phrases and conversational fallbacks.
//  */
// export const routeVoiceCommand = async (
//   command: string,
//   navigate: (screen: string) => void,
// ): Promise<void> => {
//   const lower = command.toLowerCase().trim();
//   console.log('🎙️ Routing voice command →', lower);

//   const go = (screen: string, label: string): void => {
//     navigate(screen);
//     // Tts.speak(`Opening ${label}`);
//   };

//   // --- Utility helpers ---
//   const includesAny = (keys: string[]): boolean =>
//     keys.some(k => lower.includes(k));

//   // ---------------------------
//   // 🔹 Navigation Intents
//   // ---------------------------
//   if (includesAny(['login', 'sign in', 'log in'])) return go('Login', 'Login');
//   if (includesAny(['home', 'main'])) return go('Home', 'Home');
//   if (includesAny(['profile', 'account'])) return go('Profile', 'Profile');
//   if (includesAny(['style profile', 'styling profile', 'style settings']))
//     return go('StyleProfileScreen', 'Style Profile');
//   if (includesAny(['explore', 'trends', 'discover']))
//     return go('Explore', 'Explore');
//   if (includesAny(['wardrobe', 'closet'])) return go('Wardrobe', 'Wardrobe');
//   if (includesAny(['settings', 'preferences', 'options']))
//     return go('Settings', 'Settings');
//   if (includesAny(['barcode', 'scanner', 'scan']))
//     return go('BarcodeScannerScreen', 'Barcode Scanner');
//   if (includesAny(['measurements', 'sizes', 'fit data']))
//     return go('Measurements', 'Measurements');
//   if (includesAny(['budget', 'brands', 'spending']))
//     return go('BudgetAndBrands', 'Budget and Brands');
//   if (includesAny(['appearance', 'look settings']))
//     return go('Appearance', 'Appearance');
//   if (includesAny(['lifestyle', 'daily life', 'routine']))
//     return go('Lifestyle', 'Lifestyle');
//   if (includesAny(['shopping habits', 'shopping']))
//     return go('ShoppingHabits', 'Shopping Habits');
//   if (includesAny(['style summary', 'summary']))
//     return go('StyleSummary', 'Style Summary');
//   if (includesAny(['activities', 'hobbies']))
//     return go('Activities', 'Activities');
//   if (includesAny(['body types', 'body type']))
//     return go('BodyTypes', 'Body Types');
//   if (includesAny(['climate', 'weather preferences']))
//     return go('Climate', 'Climate');
//   if (includesAny(['color preferences', 'favorite colors']))
//     return go('ColorPreferences', 'Color Preferences');
//   if (includesAny(['eye color'])) return go('EyeColor', 'Eye Color');
//   if (includesAny(['fashion goals', 'style goals']))
//     return go('FashionGoals', 'Fashion Goals');
//   if (includesAny(['fit preferences']))
//     return go('FitPreferences', 'Fit Preferences');
//   if (includesAny(['hair color'])) return go('HairColor', 'Hair Color');
//   if (includesAny(['personality', 'traits']))
//     return go('PersonalityTraits', 'Personality Traits');
//   if (includesAny(['preference strength']))
//     return go('PreferenceStrength', 'Preference Strength');
//   if (includesAny(['proportions', 'body proportions']))
//     return go('Proportions', 'Proportions');
//   if (includesAny(['search', 'find'])) return go('SearchScreen', 'Search');
//   if (includesAny(['skin tone', 'complexion']))
//     return go('SkinTone', 'Skin Tone');
//   if (includesAny(['style icon'])) return go('StyleIcon', 'Style Icon');
//   if (includesAny(['voice', 'assistant']))
//     return go('Voice', 'Voice Assistant');
//   if (includesAny(['item detail', 'details']))
//     return go('ItemDetail', 'Item Detail');
//   if (includesAny(['add item', 'add clothing', 'new item']))
//     return go('AddItem', 'Add Item');
//   if (includesAny(['outfit builder', 'create outfit']))
//     return go('OutfitBuilder', 'Outfit Builder');
//   if (includesAny(['saved outfits', 'saved looks']))
//     return go('SavedOutfits', 'Saved Outfits');
//   if (includesAny(['try on', 'overlay'])) return go('TryOnOverlay', 'Try On');
//   if (includesAny(['notifications', 'alerts']))
//     return go('Notifications', 'Notifications');
//   if (includesAny(['undertone', 'undertones']))
//     return go('Undertone', 'Undertone');
//   if (includesAny(['style keywords', 'keywords']))
//     return go('StyleKeywords', 'Style Keywords');
//   if (includesAny(['onboarding', 'setup']))
//     return go('Onboarding', 'Onboarding');
//   if (includesAny(['personal information', 'personal info']))
//     return go('PersonalInformation', 'Personal Information');
//   if (includesAny(['contact'])) return go('ContactScreen', 'Contact');
//   if (includesAny(['about', 'about stylhelpr']))
//     return go('AboutScreen', 'About');
//   if (includesAny(['feedback', 'support']))
//     return go('FeedbackScreen', 'Feedback');
//   if (
//     includesAny([
//       'ai stylist',
//       'ai chat',
//       'stylist chat',
//       'chatbot',
//       'assistant',
//     ])
//   )
//     return go('AiStylistChatScreen', 'AI Stylist Chat');
//   if (includesAny(['recreated look', 'recreate']))
//     return go('RecreatedLook', 'Recreated Look');
//   if (includesAny(['web page', 'browser']))
//     return go('WebPageScreen', 'Web Page');
//   if (includesAny(['planner', 'schedule', 'calendar']))
//     return go('Planner', 'Planner');

//   // ---------------------------
//   // 🌦️ Weather command
//   // ---------------------------
//   if (includesAny(['weather', 'forecast', 'temperature'])) {
//     try {
//       // Try to get live coordinates first
//       let lat: number | undefined;
//       let lon: number | undefined;

//       try {
//         const hasPermission = await ensureLocationPermission();
//         if (hasPermission) {
//           const position = await new Promise<Geolocation.GeoPosition>(
//             (resolve, reject) =>
//               Geolocation.getCurrentPosition(resolve, reject, {
//                 enableHighAccuracy: true,
//                 timeout: 15000,
//                 maximumAge: 1000,
//               }),
//           );
//           lat = position.coords.latitude;
//           lon = position.coords.longitude;
//         }
//       } catch (e) {
//         console.log('⚠️ Geolocation unavailable, falling back to default');
//       }

//       // If still undefined, fallback to LA (prevents 400 errors)
//       if (!lat || !lon) {
//         lat = 34.05;
//         lon = -118.24;
//       }

//       // Fetch weather with valid coordinates
//       const data = await fetchWeather(lat, lon);
//       const summary =
//         data?.description ||
//         data?.weather ||
//         data?.weather?.[0]?.description ||
//         'Clear skies';
//       const temp = data?.temperature || data?.temp || '--';

//       Alert.alert('Current Weather', `${summary}\n${Math.round(temp)}°`);
//     } catch (err) {
//       console.log('⚠️ Weather fetch failed:', err);
//       Alert.alert('Weather', 'Unable to retrieve weather right now.');
//     }
//     return;
//   }

//   // ---------------------------
//   // ⏰ Outfit reminder command
//   // ---------------------------
//   if (includesAny(['remind', 'reminder', 'plan my outfit'])) {
//     try {
//       const tomorrow = new Date();
//       tomorrow.setDate(tomorrow.getDate() + 1);
//       tomorrow.setHours(9, 0, 0, 0);

//       // Simple fallback: just show confirmation
//       Alert.alert(
//         'Reminder set',
//         'I’ll remind you to plan your outfit tomorrow at 9:00 AM.',
//       );

//       // 🔹 Optional local push (works if react-native-push-notification is set up)
//       try {
//         const PushNotification = require('react-native-push-notification');
//         PushNotification.localNotificationSchedule({
//           channelId: 'stylhelpr-default',
//           title: 'Outfit Reminder',
//           message: 'Time to plan your outfit for today!',
//           date: tomorrow,
//           allowWhileIdle: true,
//         });
//       } catch (err) {
//         console.log('⚠️ Local notification fallback failed:', err);
//       }
//     } catch (err) {
//       console.log('⚠️ Reminder scheduling failed:', err);
//       Alert.alert('Reminder', 'Failed to schedule outfit reminder.');
//     }
//     return;
//   }

//   // ---------------------------
//   // 🎧 Conversational / fallback
//   // ---------------------------
//   if (includesAny(['what are you'])) {
//     // await Tts.speak("I'm your AI stylist — I help you create amazing outfits and stay inspired.");
//     return;
//   }

//   if (includesAny(['hello', 'hi', 'hey'])) {
//     // await Tts.speak('Hey there! What would you like to open?');
//     return;
//   }

//   if (
//     lower.startsWith('go to') ||
//     lower.startsWith('open') ||
//     lower.startsWith('show me') ||
//     lower.startsWith('take me to')
//   ) {
//     const next = lower.replace(/go to|open|show me|take me to/g, '').trim();
//     if (next) {
//       await routeVoiceCommand(next, navigate);
//       return;
//     }
//   }

//   // ---------------------------
//   // 🪩 Unknown
//   // ---------------------------
//   console.log('⚠️ Unrecognized command:', command);
//   // await Tts.speak("I'm not sure what you meant. Try saying, open wardrobe or open saved outfits.");
// };

//////////////////////

// import Tts from 'react-native-tts';

// /**
//  * Global voice command router for StylHelpr.
//  * Handles natural navigation phrases and conversational fallbacks.
//  */
// export const routeVoiceCommand = async (
//   command: string,
//   navigate: (screen: string) => void,
// ): Promise<void> => {
//   const lower = command.toLowerCase().trim();
//   console.log('🎙️ Routing voice command →', lower);

//   const go = (screen: string, label: string): void => {
//     navigate(screen);
//     // Tts.speak(`Opening ${label}`);
//   };

//   // --- Utility helpers ---
//   const includesAny = (keys: string[]): boolean =>
//     keys.some(k => lower.includes(k));

//   // ---------------------------
//   // 🔹 Navigation Intents
//   // ---------------------------
//   if (includesAny(['login', 'sign in', 'log in'])) return go('Login', 'Login');
//   if (includesAny(['home', 'main'])) return go('Home', 'Home');
//   if (includesAny(['profile', 'account'])) return go('Profile', 'Profile');
//   if (includesAny(['style profile', 'styling profile', 'style settings']))
//     return go('StyleProfileScreen', 'Style Profile');
//   if (includesAny(['explore', 'trends', 'discover']))
//     return go('Explore', 'Explore');
//   if (includesAny(['wardrobe', 'closet'])) return go('Wardrobe', 'Wardrobe');
//   if (includesAny(['settings', 'preferences', 'options']))
//     return go('Settings', 'Settings');
//   if (includesAny(['barcode', 'scanner', 'scan']))
//     return go('BarcodeScannerScreen', 'Barcode Scanner');
//   if (includesAny(['measurements', 'sizes', 'fit data']))
//     return go('Measurements', 'Measurements');
//   if (includesAny(['budget', 'brands', 'spending']))
//     return go('BudgetAndBrands', 'Budget and Brands');
//   if (includesAny(['appearance', 'look settings']))
//     return go('Appearance', 'Appearance');
//   if (includesAny(['lifestyle', 'daily life', 'routine']))
//     return go('Lifestyle', 'Lifestyle');
//   if (includesAny(['shopping habits', 'shopping']))
//     return go('ShoppingHabits', 'Shopping Habits');
//   if (includesAny(['style summary', 'summary']))
//     return go('StyleSummary', 'Style Summary');
//   if (includesAny(['activities', 'hobbies']))
//     return go('Activities', 'Activities');
//   if (includesAny(['body types', 'body type']))
//     return go('BodyTypes', 'Body Types');
//   if (includesAny(['climate', 'weather preferences']))
//     return go('Climate', 'Climate');
//   if (includesAny(['color preferences', 'favorite colors']))
//     return go('ColorPreferences', 'Color Preferences');
//   if (includesAny(['eye color'])) return go('EyeColor', 'Eye Color');
//   if (includesAny(['fashion goals', 'style goals']))
//     return go('FashionGoals', 'Fashion Goals');
//   if (includesAny(['fit preferences']))
//     return go('FitPreferences', 'Fit Preferences');
//   if (includesAny(['hair color'])) return go('HairColor', 'Hair Color');
//   if (includesAny(['personality', 'traits']))
//     return go('PersonalityTraits', 'Personality Traits');
//   if (includesAny(['preference strength']))
//     return go('PreferenceStrength', 'Preference Strength');
//   if (includesAny(['proportions', 'body proportions']))
//     return go('Proportions', 'Proportions');
//   if (includesAny(['search', 'find'])) return go('SearchScreen', 'Search');
//   if (includesAny(['skin tone', 'complexion']))
//     return go('SkinTone', 'Skin Tone');
//   if (includesAny(['style icon'])) return go('StyleIcon', 'Style Icon');
//   if (includesAny(['voice', 'assistant']))
//     return go('Voice', 'Voice Assistant');
//   if (includesAny(['item detail', 'details']))
//     return go('ItemDetail', 'Item Detail');
//   if (includesAny(['add item', 'add clothing', 'new item']))
//     return go('AddItem', 'Add Item');
//   if (includesAny(['outfit builder', 'create outfit']))
//     return go('OutfitBuilder', 'Outfit Builder');
//   if (includesAny(['saved outfits', 'saved looks']))
//     return go('SavedOutfits', 'Saved Outfits');
//   if (includesAny(['try on', 'overlay'])) return go('TryOnOverlay', 'Try On');
//   if (includesAny(['notifications', 'alerts']))
//     return go('Notifications', 'Notifications');
//   if (includesAny(['undertone', 'undertones']))
//     return go('Undertone', 'Undertone');
//   if (includesAny(['style keywords', 'keywords']))
//     return go('StyleKeywords', 'Style Keywords');
//   if (includesAny(['onboarding', 'setup']))
//     return go('Onboarding', 'Onboarding');
//   if (includesAny(['personal information', 'personal info']))
//     return go('PersonalInformation', 'Personal Information');
//   if (includesAny(['contact'])) return go('ContactScreen', 'Contact');
//   if (includesAny(['about', 'about stylhelpr']))
//     return go('AboutScreen', 'About');
//   if (includesAny(['feedback', 'support']))
//     return go('FeedbackScreen', 'Feedback');
//   if (
//     includesAny([
//       'ai stylist',
//       'ai chat',
//       'stylist chat',
//       'chatbot',
//       'assistant',
//     ])
//   )
//     return go('AiStylistChatScreen', 'AI Stylist Chat');
//   if (includesAny(['recreated look', 'recreate']))
//     return go('RecreatedLook', 'Recreated Look');
//   if (includesAny(['web page', 'browser']))
//     return go('WebPageScreen', 'Web Page');
//   if (includesAny(['planner', 'schedule', 'calendar']))
//     return go('Planner', 'Planner');

//   // ---------------------------
//   // 🎧 Conversational / fallback
//   // ---------------------------
//   if (includesAny(['what are you'])) {
//     await Tts
//       .speak
//       //   "I'm your AI stylist — I help you create amazing outfits and stay inspired.",
//       ();
//     return;
//   }

//   if (includesAny(['hello', 'hi', 'hey'])) {
//     // await Tts.speak('Hey there! What would you like to open?');
//     return;
//   }

//   if (
//     lower.startsWith('go to') ||
//     lower.startsWith('open') ||
//     lower.startsWith('show me') ||
//     lower.startsWith('take me to')
//   ) {
//     const next = lower.replace(/go to|open|show me|take me to/g, '').trim();
//     if (next) {
//       // Recursively handle the extracted screen name
//       await routeVoiceCommand(next, navigate);
//       return;
//     }
//   }

//   // ---------------------------
//   // 🪩 Unknown
//   // ---------------------------
//   console.log('⚠️ Unrecognized command:', command);
//   //   await Tts.speak(
//   //     "I'm not sure what you meant. Try saying, open wardrobe or open saved outfits.",
//   //   );
// };
