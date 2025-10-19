// src/hooks/useAIVoice.ts
import Tts from 'react-native-tts';
import {API_BASE_URL} from '../config/api';

/**
 * 🎙️ speakAI
 * JS-only voice playback (no Pod changes required)
 * 1️⃣ Pings backend TTS endpoint (for availability / future use)
 * 2️⃣ Always speaks via device TTS
 */
export async function speakAI(text: string) {
  try {
    console.log('🎤 Requesting TTS:', `${API_BASE_URL}/ai/tts`);

    const res = await fetch(`${API_BASE_URL}/ai/tts`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text}),
    });

    if (res.ok) {
      console.log(
        '✅ Backend TTS available, using on-device TTS to speak text',
      );
    } else {
      console.warn('⚠️ Backend TTS unavailable, falling back to local TTS');
    }

    await Tts.stop();
    await Tts.setDefaultLanguage('en-US');
    await Tts.setDefaultRate(0.45, true);
    await Tts.speak(text);
    console.log('🔊 Playing voice (react-native-tts)');
  } catch (err) {
    console.error('💥 speakAI() failed:', err);
    try {
      await Tts.stop();
      await Tts.setDefaultLanguage('en-US');
      await Tts.setDefaultRate(0.45, true);
      await Tts.speak(text);
      console.log('🔊 Fallback TTS playback triggered');
    } catch (e2) {
      console.error('🚫 Fallback TTS also failed:', e2);
    }
  }
}
