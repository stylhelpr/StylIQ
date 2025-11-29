/**
 * Base64 encoding/decoding utilities for React Native
 * Uses a pure JavaScript implementation that works everywhere
 */

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP: Record<string, number> = {};

// Build lookup table
for (let i = 0; i < BASE64_ALPHABET.length; i++) {
  BASE64_LOOKUP[BASE64_ALPHABET[i]] = i;
}

/**
 * Encode a string to base64
 * Pure JavaScript implementation that works in React Native
 */
export const encodeBase64 = (str: string): string => {
  let result = '';
  let i = 0;

  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;

    const bitmap = (a << 16) | (b << 8) | c;

    result += BASE64_ALPHABET[(bitmap >> 18) & 63];
    result += BASE64_ALPHABET[(bitmap >> 12) & 63];
    result += i - 2 < str.length ? BASE64_ALPHABET[(bitmap >> 6) & 63] : '=';
    result += i - 1 < str.length ? BASE64_ALPHABET[bitmap & 63] : '=';
  }

  return result;
};

/**
 * Decode a base64 string
 * Pure JavaScript implementation that works in React Native
 */
export const decodeBase64 = (str: string): string => {
  let result = '';
  let i = 0;

  // Remove whitespace and padding
  str = str.replace(/\s/g, '');

  while (i < str.length) {
    const a = BASE64_LOOKUP[str[i++]] || 0;
    const b = BASE64_LOOKUP[str[i++]] || 0;
    const c = BASE64_LOOKUP[str[i++]] || 0;
    const d = BASE64_LOOKUP[str[i++]] || 0;

    const bitmap = (a << 18) | (b << 12) | (c << 6) | d;

    result += String.fromCharCode((bitmap >> 16) & 255);

    if (str[i - 2] !== '=') {
      result += String.fromCharCode((bitmap >> 8) & 255);
    }

    if (str[i - 1] !== '=') {
      result += String.fromCharCode(bitmap & 255);
    }
  }

  return result;
};

/**
 * Safely encode an object to base64
 */
export const encodeObjectToBase64 = (obj: any): string => {
  try {
    const jsonStr = JSON.stringify(obj);
    return encodeBase64(jsonStr);
  } catch (error) {
    console.error('[Base64] Failed to encode object:', error);
    throw error;
  }
};

/**
 * Safely decode a base64 string to an object
 */
export const decodeBase64ToObject = <T = any>(encodedStr: string): T => {
  try {
    const jsonStr = decodeBase64(encodedStr);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('[Base64] Failed to decode object:', error);
    throw error;
  }
};
