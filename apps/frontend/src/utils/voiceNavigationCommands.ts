// src/utils/voiceNavigation.ts
import Tts from 'react-native-tts';

type VoiceRoute =
  | {
      keywords: string[];
      screen: string;
    }
  | {
      keywords: string[];
      chain: string[]; // for nested navigation like Settings → PersonalInformation
    };

export const handleVoiceNavigation = (
  command: string,
  navigate: (screen: string) => void,
  scrollY?: any,
  weather?: any,
) => {
  const cmd = command.toLowerCase().trim();

  const VOICE_ROUTES: VoiceRoute[] = [
    {keywords: ['home', 'main'], screen: 'Home'},
    {keywords: ['fashion news', 'discover'], screen: 'Explore'},
    {keywords: ['profile', 'account'], screen: 'Profile'},
    {keywords: ['wardrobe', 'closet'], screen: 'Wardrobe'},
    {keywords: ['settings', 'preferences'], screen: 'Settings'},
    {keywords: ['notifications', 'alerts'], screen: 'Notifications'},
    {
      keywords: ['saved outfit', 'saved outfits', 'favorite outfits'],
      screen: 'SavedOutfits',
    },
    {keywords: ['create outfit', 'style me'], screen: 'Outfit'},
    {keywords: ['add clothes', 'add item'], screen: 'AddItem'},
    {
      keywords: [
        'calendar',
        'planner',
        'schedule',
        'scheduled outfits',
        'planned outfits',
      ],
      screen: 'Planner',
    },
    {keywords: ['wardrobe', 'cothes'], screen: 'ClosetScreen'},
    {
      keywords: ['ai stylist', 'ai', 'chatbot', 'ask'],
      screen: 'AiStylistChatScreen',
    },
    {keywords: ['feedback', 'support'], screen: 'FeedbackScreen'},
    {keywords: ['about', 'company info'], screen: 'AboutScreen'},
    {keywords: ['contact', 'contact support', 'help'], screen: 'ContactScreen'},
    {keywords: ['search', 'find', 'search clothes'], screen: 'Search'},
    {keywords: ['preferences'], screen: 'PreferencesScreen'},

    // ✅ Nested navigation example
    {
      keywords: [
        'personal information',
        'personal info',
        'profile information',
        'my info',
        'personal',
      ],
      chain: ['Settings', 'PersonalInformation'],
    },
  ];

  // 🔁 Route matching
  for (const route of VOICE_ROUTES) {
    if (route.keywords.some(k => cmd.includes(k))) {
      console.log('[🎤 Voice Navigation] Matched:', route);

      if ('chain' in route) {
        // ⛓️ Handle nested navigation
        route.chain.forEach((screen, i) => {
          setTimeout(() => navigate(screen), i * 150);
        });
      } else {
        // 🔁 Direct single screen navigation
        navigate(route.screen);
      }
      return;
    }
  }

  // 👔 Contextual "What should I wear" suggestion
  if (cmd.includes('what should i wear') && weather) {
    if (weather.fahrenheit.main.temp < 60) {
      Tts.speak(
        "It's chilly. Try layering a knit under a trench with loafers.",
      );
    } else if (weather.fahrenheit.main.temp > 85) {
      Tts.speak("It's warm. Go for linen trousers and a Cuban-collar shirt.");
    } else {
      Tts.speak('Perfect weather. Try chinos, a polo, and monk straps.');
    }
    return;
  }

  // 📈 Scroll to trends
  if (cmd.includes('trends') && scrollY) {
    scrollY.setValue(600);
  }
};

/////////////////

// // src/utils/voiceNavigation.ts
// import Tts from 'react-native-tts';

// type VoiceRoute = {
//   keywords: string[];
//   screen: string;
// };

// /**
//  * Handles navigation based on voice command
//  */
// export const handleVoiceNavigation = (
//   command: string,
//   navigate: (screen: string) => void,
//   scrollY?: any,
//   weather?: any,
// ) => {
//   const cmd = command.toLowerCase().trim();

//   const VOICE_ROUTES: VoiceRoute[] = [
//     {keywords: ['home', 'main'], screen: 'Home'},
//     {keywords: ['fashion news', 'discover'], screen: 'Explore'},
//     {keywords: ['profile', 'account'], screen: 'Profile'},

//     {keywords: ['wardrobe', 'closet'], screen: 'Wardrobe'},
//     {keywords: ['settings', 'preferences'], screen: 'Settings'},
//     {keywords: ['notifications', 'alerts'], screen: 'Notifications'},
//     {keywords: ['style me', 'outfit'], screen: 'Outfit'},
//     {keywords: ['add clothes', 'add item'], screen: 'AddItem'},
//     {keywords: ['saved looks', 'favorites'], screen: 'SavedOutfits'},
//     {keywords: ['calendar', 'planner', 'schedule'], screen: 'Planner'},
//     {
//       keywords: ['ai stylist', 'ai', 'chatbot', 'ask'],
//       screen: 'AiStylistChatScreen',
//     },
//     {keywords: ['feedback', 'support'], screen: 'FeedbackScreen'},
//     {keywords: ['about', 'company info'], screen: 'AboutScreen'},
//     {keywords: ['contact', 'help'], screen: 'ContactScreen'},
//     {keywords: ['search'], screen: 'Search'},
//     {keywords: ['search'], screen: 'Search'},
//     {keywords: ['search'], screen: 'Search'},
//     {keywords: ['search'], screen: 'Search'},
//     {keywords: ['preferences'], screen: 'PreferencesScreen'},
//     {keywords: ['personal information'], screen: 'PersonalInformationScreen'},
//   ];

//   // 🔁 Route navigation
//   for (const route of VOICE_ROUTES) {
//     if (route.keywords.some(k => cmd.includes(k))) {
//       console.log('[🎤 Voice Navigation] →', route.screen);
//       navigate(route.screen);
//       return;
//     }
//   }

//   // 👔 Special contextual commands
//   if (cmd.includes('what should i wear') && weather) {
//     if (weather.fahrenheit.main.temp < 60) {
//       Tts.speak(
//         "It's chilly. Try layering a knit under a trench with loafers.",
//       );
//     } else if (weather.fahrenheit.main.temp > 85) {
//       Tts.speak("It's warm. Go for linen trousers and a Cuban-collar shirt.");
//     } else {
//       Tts.speak('Perfect weather. Try chinos, a polo, and monk straps.');
//     }
//     return;
//   }

//   // 📈 Scroll example
//   if (cmd.includes('trends') && scrollY) {
//     scrollY.setValue(600);
//   }
// };

///////////////

// // src/utils/voiceNavigation.ts
// import Tts from 'react-native-tts';

// type VoiceRoute = {
//   keywords: string[];
//   screen: string;
// };

// /**
//  * Handles navigation based on voice command
//  */
// export const handleVoiceNavigation = (
//   command: string,
//   navigate: (screen: string) => void,
//   scrollY?: any,
//   weather?: any,
// ) => {
//   const cmd = command.toLowerCase().trim();

//   const VOICE_ROUTES: VoiceRoute[] = [
//     {keywords: ['home', 'main'], screen: 'Home'},
//     {keywords: ['profile', 'account'], screen: 'Profile'},
//     {keywords: ['fashion news', 'discover'], screen: 'Explore'},
//     {keywords: ['wardrobe', 'closet'], screen: 'Wardrobe'},
//     {keywords: ['settings', 'preferences'], screen: 'Settings'},
//     {keywords: ['notifications', 'alerts'], screen: 'Notifications'},
//     {keywords: ['style me', 'outfit'], screen: 'Outfit'},
//     {keywords: ['add clothes', 'add item'], screen: 'AddItem'},
//     {keywords: ['saved looks', 'favorites'], screen: 'SavedOutfits'},
//     {keywords: ['calendar', 'planner', 'schedule'], screen: 'Planner'},
//     {keywords: ['ai stylist', 'chatbot', 'ask'], screen: 'AiStylistChatScreen'},
//     {keywords: ['feedback', 'support'], screen: 'FeedbackScreen'},
//     {keywords: ['about', 'company info'], screen: 'AboutScreen'},
//     {keywords: ['contact', 'help'], screen: 'ContactScreen'},
//     {keywords: ['search'], screen: 'Search'},
//   ];

//   // 🔁 Route navigation
//   for (const route of VOICE_ROUTES) {
//     if (route.keywords.some(k => cmd.includes(k))) {
//       console.log('[🎤 Voice Navigation] →', route.screen);
//       navigate(route.screen);
//       return;
//     }
//   }

//   // 👔 Special contextual commands
//   if (cmd.includes('what should i wear') && weather) {
//     if (weather.fahrenheit.main.temp < 60) {
//       Tts.speak(
//         "It's chilly. Try layering a knit under a trench with loafers.",
//       );
//     } else if (weather.fahrenheit.main.temp > 85) {
//       Tts.speak("It's warm. Go for linen trousers and a Cuban-collar shirt.");
//     } else {
//       Tts.speak('Perfect weather. Try chinos, a polo, and monk straps.');
//     }
//     return;
//   }

//   // 📈 Scroll example
//   if (cmd.includes('trends') && scrollY) {
//     scrollY.setValue(600);
//   }
// };
