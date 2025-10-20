import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'tts_enabled';

export async function setTtsEnabled(enabled: boolean) {
  await AsyncStorage.setItem(KEY, enabled ? 'true' : 'false');
}

export async function isTtsEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'true';
}
