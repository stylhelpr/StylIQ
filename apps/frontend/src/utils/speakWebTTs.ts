// speakWebTTS.ts
import {API_BASE_URL} from '../config/api';
import {globalTtsRef} from '../MainApp';

export async function speakWebTTS(text: string) {
  if (!text?.trim()) return;
  try {
    const url = `${API_BASE_URL}/ai/tts?text=${encodeURIComponent(text)}`;
    const js = `
      (function() {
        const html = "<audio src='${url}' autoplay playsinline></audio>";
        document.body.innerHTML = html;
      })();
      true;
    `;
    globalTtsRef.current?.current?.injectJavaScript(js);
  } catch (err) {
    console.warn('🎙️ WebView TTS failed:', err);
  }
}
