// src/utils/instantTts.ts
// -----------------------------------------------------------------------------
// ⚡ instantTts — Ultra-fast on-device voice playback (TypeScript safe)
// -----------------------------------------------------------------------------
// ✅ Fixes TS error on iosVoiceId (string only)
// ✅ Emits tts-start / tts-finish safely via VoiceBus (no warning spam)
// ✅ Prioritizes high-quality neural voices: Zoe → Ava → Samantha → system default
// ✅ Works cross-platform (iOS + Android)
// ✅ Zero-latency local playback after first use
// -----------------------------------------------------------------------------

import Tts from 'react-native-tts';
import {VoiceBus} from './VoiceBus';

let initialized = false;
let currentVoiceId: string = '';

// 🧩 Safe event emitter to avoid “no listeners registered” warnings
function safeEmit(event: string, payload?: any) {
  try {
    // listenerCount is available in Node-style emitters; if not, skip gracefully
    if ((VoiceBus as any)?.listenerCount?.(event) > 0) {
      VoiceBus.emit(event, payload);
    }
  } catch {
    // fallback: just skip if VoiceBus not ready
  }
}

export const initInstantTts = async (): Promise<void> => {
  if (initialized) return;

  try {
    const voices = await Tts.voices();

    console.log(
      '📢 iOS Voices:',
      voices.map(v => `${v.id} | ${v.name} | ${v.language}`),
    );

    // 🎯 Prefer high-quality neural or premium voices
    const preferredVoice =
      voices.find(v => v.id?.toLowerCase().includes('zoe-premium')) ||
      voices.find(v => v.id?.toLowerCase().includes('ava-premium')) ||
      voices.find(v => v.id?.toLowerCase().includes('samantha-premium')) ||
      voices.find(v => v.id?.toLowerCase().includes('zoe')) ||
      voices.find(v => v.id?.toLowerCase().includes('ava')) ||
      voices.find(v => v.id?.toLowerCase().includes('samantha')) ||
      voices.find(v => v.id?.toLowerCase().includes('siri_female_en-us')) ||
      voices.find(v => v.id?.toLowerCase().includes('siri_male_en-us')) ||
      voices.find(v => v.networkConnectionRequired === false) ||
      voices[0];

    if (preferredVoice?.id) {
      currentVoiceId = preferredVoice.id;
      if (preferredVoice.language) {
        await Tts.setDefaultLanguage(preferredVoice.language);
      }
      await Tts.setDefaultVoice(preferredVoice.id);
      console.log(
        '✅ Using TTS voice:',
        preferredVoice.name || preferredVoice.id,
      );
    } else {
      console.warn('⚠️ No preferred TTS voice found — using system default.');
    }

    // 🎧 Natural pacing tuned for Apple voices
    await Tts.setDefaultRate(0.47);
    await Tts.setDefaultPitch(1.05);

    // 🪄 Prime engine silently (first-use lag killer)
    await Tts.speak(' ', {
      iosVoiceId: currentVoiceId,
      rate: 0.47,
      pitch: 1.05,
    });

    initialized = true;
    console.log('✅ Instant TTS initialized');
  } catch (err) {
    console.warn('⚠️ TTS init failed:', err);
  }
};

export const instantSpeak = async (text: string): Promise<void> => {
  if (!text?.trim()) return;
  try {
    if (!initialized) await initInstantTts();

    // 🔊 Announce lifecycle
    safeEmit('tts-start');

    await Tts.stop();

    await Tts.speak(text, {
      iosVoiceId: currentVoiceId,
      rate: 0.47,
      pitch: 1.05,
    });

    // Native TTS emits "tts-finish" asynchronously — ensure we trigger after delay
    Tts.addEventListener('tts-finish', () => safeEmit('tts-finish'));
    Tts.addEventListener('tts-cancel', () => safeEmit('tts-finish'));
  } catch (err) {
    console.warn('TTS speak error:', err);
    safeEmit('tts-finish');
  }
};

/////////////////

// // src/utils/instantTts.ts
// // -----------------------------------------------------------------------------
// // ⚡ instantTts — Ultra-fast on-device voice playback (TypeScript safe)
// // -----------------------------------------------------------------------------
// // ✅ Fixes TS error on iosVoiceId (string only)
// // ✅ Prioritizes high-quality voices: Zoe → Ava → Samantha → system default
// // ✅ Works cross-platform (iOS + Android)
// // ✅ Zero-latency local playback after first use
// // -----------------------------------------------------------------------------

// import Tts from 'react-native-tts';

// let initialized = false;
// let currentVoiceId: string = '';

// export const initInstantTts = async (): Promise<void> => {
//   if (initialized) return;

//   try {
//     const voices = await Tts.voices();

//     console.log(
//       '📢 iOS Voices:',
//       voices.map(v => `${v.id} | ${v.name} | ${v.language}`),
//     );

//     // 🎯 Prefer high-quality neural or premium voices
//     const preferredVoice =
//       voices.find(v => v.id?.toLowerCase().includes('zoe-premium')) ||
//       voices.find(v => v.id?.toLowerCase().includes('ava-premium')) ||
//       voices.find(v => v.id?.toLowerCase().includes('samantha-premium')) ||
//       voices.find(v => v.id?.toLowerCase().includes('zoe')) ||
//       voices.find(v => v.id?.toLowerCase().includes('ava')) ||
//       voices.find(v => v.id?.toLowerCase().includes('samantha')) ||
//       voices.find(v => v.id?.toLowerCase().includes('siri_female_en-us')) ||
//       voices.find(v => v.id?.toLowerCase().includes('siri_male_en-us')) ||
//       voices.find(v => v.networkConnectionRequired === false) ||
//       voices[0];

//     if (preferredVoice?.id) {
//       currentVoiceId = preferredVoice.id;
//       if (preferredVoice.language) {
//         await Tts.setDefaultLanguage(preferredVoice.language);
//       }
//       await Tts.setDefaultVoice(preferredVoice.id);
//       console.log(
//         '✅ Using TTS voice:',
//         preferredVoice.name || preferredVoice.id,
//       );
//     } else {
//       console.warn('⚠️ No preferred TTS voice found — using system default.');
//     }

//     // 🎧 Natural pacing tuned for Apple voices
//     await Tts.setDefaultRate(0.47);
//     await Tts.setDefaultPitch(1.05);

//     // 🪄 Prime the engine silently (first-use lag killer)
//     await Tts.speak(' ', {
//       iosVoiceId: currentVoiceId,
//       rate: 0.47,
//       pitch: 1.05,
//     });

//     initialized = true;
//     console.log('✅ Instant TTS initialized');
//   } catch (err) {
//     console.warn('⚠️ TTS init failed:', err);
//   }
// };

// export const instantSpeak = async (text: string): Promise<void> => {
//   if (!text?.trim()) return;
//   try {
//     if (!initialized) await initInstantTts();

//     await Tts.stop();

//     await Tts.speak(text, {
//       iosVoiceId: currentVoiceId,
//       rate: 0.47,
//       pitch: 1.05,
//     });
//   } catch (err) {
//     console.warn('TTS speak error:', err);
//   }
// };

//////////////////

// import Tts from 'react-native-tts';

// // 🔹 Preload & configure TTS once at app startup
// export const initInstantTts = async () => {
//   try {
//     // List all available voices
//     const voices = await Tts.voices();

//     // Pick a good default (Apple Neural or Google local)
//     const preferredVoice =
//       voices.find(
//         v =>
//           v.id.includes('siri_female_en-US') ||
//           v.id.includes('com.apple.ttsbundle.Samantha'),
//       ) || voices.find(v => v.networkConnectionRequired === false); // fallback to local

//     if (preferredVoice) {
//       await Tts.setDefaultVoice(preferredVoice.id);
//       console.log(
//         '✅ TTS voice set to:',
//         preferredVoice.name || preferredVoice.id,
//       );
//     }

//     // Optional: adjust tone and rate for clarity
//     await Tts.setDefaultRate(0.45);
//     await Tts.setDefaultPitch(1.0);

//     // 🔸 Preload engine with a silent call so first use is instant
//     await Tts.speak(' ', {
//       iosVoiceId: preferredVoice?.id,
//       rate: 0.45,
//       pitch: 1.0,
//     });

//     console.log('✅ Instant TTS initialized');
//   } catch (err) {
//     console.warn('⚠️ TTS init failed:', err);
//   }
// };

// // 🔹 Speak instantly with near-zero delay
// export const instantSpeak = async (text: string) => {
//   if (!text?.trim()) return;
//   try {
//     await Tts.stop(); // stop any previous speech instantly
//     await Tts.speak(text);
//   } catch (err) {
//     console.warn('TTS speak error:', err);
//   }
// };
