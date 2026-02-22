// src/utils/voiceCommandMap.ts
// -----------------------------------------------------------------------------
// 🧭 StylHelpr Voice Command Map
// -----------------------------------------------------------------------------
// • Maps user utterances → actions, screens, or AI endpoints
// • Works seamlessly with `routeVoiceCommand()`
// • Organized by feature tier (Navigation → AI → Shopping → Personality)
// • Now includes contextual awareness via VoiceMemory
// -----------------------------------------------------------------------------

import {fetchWeather, getCurrentLocation} from '../travelWeather';
import React from 'react';
import {
  scheduleLocalNotification,
  initializeNotifications,
} from '../notificationService';
import {API_BASE_URL} from '../../config/api';
import {Alert} from 'react-native';
import {VoiceMemory} from './VoiceMemory';

// ✅ Define voice command entries
// NOTE: All navigation keywords commented out to disable voice-triggered navigation.
// Uncomment to re-enable.
export const voiceCommandMap: Array<{keywords: string[]; action: (...args: any[]) => any}> = [
  // ---------------------------------------------------------------------------
  // 🔹 TIER 1 — Navigation & Utility
  // ---------------------------------------------------------------------------
  // {
  //   keywords: [‘home’, ‘main’],
  //   action: (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘navigation’);
  //     VoiceMemory.pushContext({
  //       role: ‘user’,
  //       text: ‘go home’,
  //       timestamp: Date.now(),
  //     });
  //     navigate(‘Home’);
  //   },
  // },
  // {
  //   keywords: [‘profile’, ‘account’, ‘my profile’],
  //   action: (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘navigation’);
  //     VoiceMemory.pushContext({
  //       role: ‘user’,
  //       text: ‘go to profile’,
  //       timestamp: Date.now(),
  //     });
  //     navigate(‘Profile’);
  //   },
  // },
  // {
  //   keywords: [‘wardrobe’, ‘closet’, ‘my clothes’],
  //   action: (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘navigation’);
  //     VoiceMemory.pushContext({
  //       role: ‘user’,
  //       text: ‘go to wardrobe’,
  //       timestamp: Date.now(),
  //     });
  //     navigate(‘Wardrobe’);
  //   },
  // },
  // {
  //   keywords: [‘saved outfits’, ‘saved looks’, ‘favorites’],
  //   action: (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘navigation’);
  //     navigate(‘SavedOutfits’);
  //   },
  // },
  // {
  //   keywords: [‘outfit builder’, ‘create outfit’, ‘build outfit’],
  //   action: (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘builder’);
  //     navigate(‘OutfitBuilder’);
  //   },
  // },
  // {
  //   keywords: [‘notifications’, ‘alerts’],
  //   action: (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘navigation’);
  //     navigate(‘Notifications’);
  //   },
  // },
  // {
  //   keywords: [‘settings’, ‘preferences’, ‘options’],
  //   action: (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘navigation’);
  //     navigate(‘Settings’);
  //   },
  // },

  // ---------------------------------------------------------------------------
  // 👗 TIER 2 — Wardrobe-Aware Styling (AI) /
  // ---------------------------------------------------------------------------
  // {
  //   keywords: [‘plan my outfit for today’, ‘today outfit’, ‘today look’],
  //   action: async (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘style’);
  //     VoiceMemory.set(‘lastDate’, ‘today’);
  //     navigate(‘OutfitBuilder’, {context: ‘today’});
  //   },
  // },
  // {
  //   keywords: [‘plan my outfit for tomorrow’, ‘tomorrow outfit’],
  //   action: async (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘style’);
  //     VoiceMemory.set(‘lastDate’, ‘tomorrow’);
  //     navigate(‘OutfitBuilder’, {context: ‘tomorrow’});
  //   },
  // },
  // {
  //   keywords: [‘plan my outfit for the weekend’, ‘weekend look’],
  //   action: async (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘style’);
  //     VoiceMemory.set(‘lastDate’, ‘weekend’);
  //     navigate(‘OutfitBuilder’, {context: ‘weekend’});
  //   },
  // },
  // {
  //   keywords: [‘show me outfits with’, ‘show outfits with’],
  //   action: async (navigate: any, text: string) => {
  //     const query = text.replace(/show (me )?outfits with/gi, ‘’).trim();
  //     VoiceMemory.set(‘lastIntent’, ‘style’);
  //     VoiceMemory.set(‘lastTopic’, query);
  //     navigate(‘OutfitBuilder’, {query});
  //   },
  // },
  // {
  //   keywords: [‘add this to my wardrobe’, ‘add item’, ‘add clothing’],
  //   action: (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘addItem’);
  //     navigate(‘AddItem’);
  //   },
  // },
  // {
  //   keywords: [‘find something that goes with’, ‘match with’],
  //   action: async (navigate: any, text: string) => {
  //     const item = text.replace(/find something that goes with/gi, ‘’).trim();
  //     VoiceMemory.set(‘lastIntent’, ‘style’);
  //     VoiceMemory.set(‘lastTopic’, item);
  //     navigate(‘OutfitBuilder’, {matchItem: item});
  //   },
  // },

  // ---------------------------------------------------------------------------
  // 🛍 TIER 3 — Missing Items & Shopping
  // ---------------------------------------------------------------------------
  // {
  //   keywords: [‘find shoes that match’, ‘find shoes for’],
  //   action: async (navigate: any, text: string) => {
  //     const context = text.replace(/find shoes (that match|for)/gi, ‘’).trim();
  //     VoiceMemory.set(‘lastIntent’, ‘shopping’);
  //     VoiceMemory.set(‘lastTopic’, context);
  //     navigate(‘Explore’, {search: `dress shoes for ${context}`});
  //   },
  // },
  // {
  //   keywords: [‘show me similar shirts’, ‘find similar’],
  //   action: (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘shopping’);
  //     navigate(‘Explore’, {mode: ‘similar’});
  //   },
  // },
  // {
  //   keywords: [‘shop this outfit’, ‘shop this look’],
  //   action: (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘shopping’);
  //     navigate(‘Explore’, {mode: ‘shop’});
  //   },
  // },
  // {
  //   keywords: [‘add to favorites’, ‘save this look’],
  //   action: async () => {
  //     VoiceMemory.set(‘lastIntent’, ‘favorites’);
  //     console.log(‘⭐ Saving current look...’);
  //   },
  // },

  // ---------------------------------------------------------------------------
  // 🌦 TIER 4 — Smart Nudges & Reminders
  // ---------------------------------------------------------------------------
  // {
  //   keywords: ["what’s the weather", ‘weather today’, ‘forecast’],
  //   action: async () => {
  //     try {
  //       VoiceMemory.set(‘lastIntent’, ‘weather’);
  //       VoiceMemory.set(‘lastDate’, ‘today’);
  //
  //       let lat: number | undefined;
  //       let lon: number | undefined;
  //       try {
  //         const loc = await getCurrentLocation();
  //         lat = loc.lat;
  //         lon = loc.lon;
  //       } catch {
  //         // GPS unavailable
  //       }
  //
  //       if (!lat || !lon) {
  //         Alert.alert(
  //           ‘Weather’,
  //           "I can’t access your location right now. Try asking for weather in a specific city.",
  //         );
  //         return;
  //       }
  //
  //       if (__DEV__) console.log(`[VoiceWeather] lat=${lat}, lng=${lon}`);
  //
  //       const data = await fetchWeather(lat, lon);
  //       const summary =
  //         data?.condition ||
  //         ‘clear skies with mild temperatures’;
  //       const temp = data?.temperature || ‘--’;
  //       Alert.alert(‘Current Weather’, `${summary}\n${temp}°`);
  //     } catch {
  //       Alert.alert(‘Unable to fetch weather right now.’);
  //     }
  //   },
  // },
  //
  // {
  //   keywords: [
  //     ‘what about tomorrow’,
  //     ‘tomorrow forecast’,
  //     "what about tomorrow’s weather",
  //   ],
  //   action: async () => {
  //     try {
  //       const lastIntent = VoiceMemory.get(‘lastIntent’) || ‘weather’;
  //       const lastCity = VoiceMemory.get(‘lastCity’);
  //       VoiceMemory.set(‘lastDate’, ‘tomorrow’);
  //
  //       const {getCurrentLocation, fetchWeather} = await import(
  //         ‘../travelWeather’
  //       );
  //       let forecast;
  //
  //       if (lastCity) {
  //         console.log(
  //           ‘🌦 [VOICE] fetching tomorrow forecast for lastCity →’,
  //           lastCity,
  //         );
  //         forecast = await fetchWeather(
  //           undefined,
  //           undefined,
  //           ‘imperial’,
  //           ‘tomorrow’,
  //           lastCity,
  //         );
  //       } else {
  //         const {lat, lon} = await getCurrentLocation();
  //         forecast = await fetchWeather(lat, lon, ‘imperial’, ‘tomorrow’);
  //       }
  //
  //       globalThis.WeatherBus?.emit?.(‘update’, {
  //         city: forecast.city,
  //         condition: forecast.condition,
  //         temperature: forecast.temperature,
  //         day: ‘tomorrow’,
  //       });
  //
  //       VoiceMemory.set(‘lastCity’, forecast.city);
  //       VoiceMemory.pushContext({
  //         role: ‘assistant’,
  //         text: `Tomorrow in ${forecast.city}, expect ${forecast.condition} around ${forecast.temperature}°.`,
  //         timestamp: Date.now(),
  //       });
  //     } catch (err) {
  //       console.error(‘❌ tomorrow forecast fetch failed:’, err);
  //       Alert.alert(‘Error’, ‘Could not fetch tomorrow’s forecast.’);
  //     }
  //   },
  // },

  // ---------------------------------------------------------------------------
  // 💬 TIER 5 — Personality & Fashion Chat
  // ---------------------------------------------------------------------------
  // {
  //   keywords: [‘how do I look’, ‘do I look good’],
  //   action: async () => {
  //     VoiceMemory.set(‘lastIntent’, ‘chat’);
  //     Alert.alert(‘🔥 You look amazing — total runway energy today.’);
  //   },
  // },
  // {
  //   keywords: [‘what’s trending’, ‘show me trends’, ‘trending now’],
  //   action: (navigate: any) => {
  //     VoiceMemory.set(‘lastIntent’, ‘trends’);
  //     navigate(‘Explore’);
  //   },
  // },
  // {
  //   keywords: [‘rate my outfit’, ‘score my outfit’],
  //   action: async () => {
  //     VoiceMemory.set(‘lastIntent’, ‘rating’);
  //     Alert.alert(‘🧠 9/10 — switch the shoes for a sharper finish.’);
  //   },
  // },
  // {
  //   keywords: [‘what should I pack’, ‘packing list’],
  //   action: async (navigate: any, text: string) => {
  //     const city = text
  //       .replace(/(what should I pack|packing list)/gi, ‘’)
  //       .trim();
  //     VoiceMemory.set(‘lastIntent’, ‘style’);
  //     VoiceMemory.set(‘lastCity’, city);
  //     navigate(‘OutfitBuilder’, {context: `packing for ${city}`});
  //   },
  // },
];

// -----------------------------------------------------------------------------
// 🔍 Helper to match a command (now context-aware)
// -----------------------------------------------------------------------------
export function matchVoiceCommand(
  text: string,
  navigate: (screen: string, params?: any) => void,
) {
  const lower = text.toLowerCase();
  VoiceMemory.pushContext({role: 'user', text, timestamp: Date.now()});

  for (const cmd of voiceCommandMap) {
    if (cmd.keywords.some(k => lower.includes(k))) {
      cmd.action(navigate, text);
      return true;
    }
  }

  return false;
}

//////////////////

// // src/utils/voiceCommandMap.ts
// // -----------------------------------------------------------------------------
// // 🧭 StylHelpr Voice Command Map
// // -----------------------------------------------------------------------------
// // • Maps user utterances → actions, screens, or AI endpoints
// // • Works seamlessly with `routeVoiceCommand()`
// // • Organized by feature tier (Navigation → AI → Shopping → Personality)
// // -----------------------------------------------------------------------------

// import {fetchWeather} from '../travelWeather';
// import React, {useState, useEffect, useRef} from 'react';
// import {
//   scheduleLocalNotification,
//   initializeNotifications,
// } from '../notificationService';
// import {API_BASE_URL} from '../../config/api';
// import {Alert} from 'react-native';

// // ✅ Define voice command entries
// export const voiceCommandMap = [
//   // ---------------------------------------------------------------------------
//   // 🔹 TIER 1 — Navigation & Utility
//   // ---------------------------------------------------------------------------
//   {
//     keywords: ['home', 'main'],
//     action: (navigate: any) => navigate('Home'),
//   },
//   {
//     keywords: ['profile', 'account', 'my profile'],
//     action: (navigate: any) => navigate('Profile'),
//   },
//   {
//     keywords: ['wardrobe', 'closet', 'my clothes'],
//     action: (navigate: any) => navigate('Wardrobe'),
//   },
//   {
//     keywords: ['saved outfits', 'saved looks', 'favorites'],
//     action: (navigate: any) => navigate('SavedOutfits'),
//   },
//   {
//     keywords: ['outfit builder', 'create outfit', 'build outfit'],
//     action: (navigate: any) => navigate('OutfitBuilder'),
//   },
//   {
//     keywords: ['notifications', 'alerts'],
//     action: (navigate: any) => navigate('Notifications'),
//   },
//   {
//     keywords: ['settings', 'preferences', 'options'],
//     action: (navigate: any) => navigate('Settings'),
//   },

//   // ---------------------------------------------------------------------------
//   // 👗 TIER 2 — Wardrobe-Aware Styling (AI)
//   // ---------------------------------------------------------------------------
//   {
//     keywords: ['plan my outfit for today', 'today outfit', 'today look'],
//     action: async (navigate: any) => {
//       navigate('OutfitBuilder', {context: 'today'});
//     },
//   },
//   {
//     keywords: ['plan my outfit for tomorrow', 'tomorrow outfit'],
//     action: async (navigate: any) => {
//       navigate('OutfitBuilder', {context: 'tomorrow'});
//     },
//   },
//   {
//     keywords: ['plan my outfit for the weekend', 'weekend look'],
//     action: async (navigate: any) => {
//       navigate('OutfitBuilder', {context: 'weekend'});
//     },
//   },
//   {
//     keywords: ['show me outfits with', 'show outfits with'],
//     action: async (navigate: any, text: string) => {
//       const query = text.replace(/show (me )?outfits with/gi, '').trim();
//       navigate('OutfitBuilder', {query});
//     },
//   },
//   {
//     keywords: ['add this to my wardrobe', 'add item', 'add clothing'],
//     action: (navigate: any) => navigate('AddItem'),
//   },
//   {
//     keywords: ['find something that goes with', 'match with'],
//     action: async (navigate: any, text: string) => {
//       const item = text.replace(/find something that goes with/gi, '').trim();
//       navigate('OutfitBuilder', {matchItem: item});
//     },
//   },

//   // ---------------------------------------------------------------------------
//   // 🛍 TIER 3 — Missing Items & Shopping
//   // ---------------------------------------------------------------------------
//   {
//     keywords: ['find shoes that match', 'find shoes for'],
//     action: async (navigate: any, text: string) => {
//       const context = text.replace(/find shoes (that match|for)/gi, '').trim();
//       navigate('Explore', {search: `dress shoes for ${context}`});
//     },
//   },
//   {
//     keywords: ['show me similar shirts', 'find similar'],
//     action: (navigate: any) => {
//       navigate('Explore', {mode: 'similar'});
//     },
//   },
//   {
//     keywords: ['shop this outfit', 'shop this look'],
//     action: (navigate: any) => navigate('Explore', {mode: 'shop'}),
//   },
//   {
//     keywords: ['add to favorites', 'save this look'],
//     action: async () => {
//       // Placeholder — integrate with your `useFavorites` hook
//       console.log('⭐ Saving current look...');
//     },
//   },

//   // ---------------------------------------------------------------------------
//   // 🌦 TIER 4 — Smart Nudges & Reminders
//   // ---------------------------------------------------------------------------
//   {
//     keywords: ['what’s the weather', 'weather today', 'forecast'],
//     action: async () => {
//       try {
//         const data = await fetchWeather();
//         const summary =
//           data?.description ||
//           data?.weather ||
//           'clear skies with mild temperatures';
//         const temp = data?.temperature || data?.temp || '--';
//         alert(`Current Weather: ${summary}\n${temp}°`);
//       } catch {
//         alert('Unable to fetch weather right now.');
//       }
//     },
//   },
//   {
//     keywords: ['remind me to plan my outfit', 'set outfit reminder'],
//     action: async () => {
//       await initializeNotifications();
//       const tomorrow = new Date();
//       tomorrow.setDate(tomorrow.getDate() + 1);
//       tomorrow.setHours(9, 0, 0, 0);

//       await scheduleLocalNotification({
//         title: 'Outfit Reminder',
//         message: 'Time to plan your outfit for today!',
//         date: tomorrow,
//       });
//       alert('✅ Reminder set for tomorrow morning.');
//     },
//   },

//   // ---------------------------------------------------------------------------
//   // 💬 TIER 5 — Personality & Fashion Chat
//   // ---------------------------------------------------------------------------
//   {
//     keywords: ['how do I look', 'do I look good'],
//     action: async () => {
//       alert('🔥 You look amazing — total runway energy today.');
//     },
//   },
//   {
//     keywords: ['what’s trending', 'show me trends', 'trending now'],
//     action: (navigate: any) => navigate('Explore'),
//   },
//   {
//     keywords: ['rate my outfit', 'score my outfit'],
//     action: async () => {
//       alert('🧠 9/10 — switch the shoes for a sharper finish.');
//     },
//   },
//   {
//     keywords: ['what should I pack', 'packing list'],
//     action: async (navigate: any, text: string) => {
//       const city = text
//         .replace(/(what should I pack|packing list)/gi, '')
//         .trim();
//       navigate('OutfitBuilder', {context: `packing for ${city}`});
//     },
//   },
// ];

// // -----------------------------------------------------------------------------
// // 🔍 Helper to match a command
// // -----------------------------------------------------------------------------
// export function matchVoiceCommand(
//   text: string,
//   navigate: (screen: string, params?: any) => void,
// ) {
//   const lower = text.toLowerCase();
//   for (const cmd of voiceCommandMap) {
//     if (cmd.keywords.some(k => lower.includes(k))) {
//       cmd.action(navigate, text);
//       return true;
//     }
//   }
//   return false;
// }
