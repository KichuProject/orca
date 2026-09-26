import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';

/**
 * Centralized ORCA API Configuration
 * Supports environment overrides, auto-discovery of host PC IP on local Wi-Fi,
 * and persistent custom URLs configured in Settings.
 */

// User's verified host PC LAN IP
const DEFAULT_LAN_HOST = '10.40.171.164';
const DEFAULT_PORT = '8000';

function resolveDefaultBaseUrl() {
  // 1. Explicit environment variable (.env)
  if (process.env.EXPO_PUBLIC_API_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '');
    if (envUrl) return envUrl;
  }

  // 2. Auto-detect host PC IP address from Expo bundler hostUri
  // When running on physical phone or emulator via Expo Go, hostUri contains the PC's IP (e.g. 10.40.171.164:8081)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (hostUri && typeof hostUri === 'string') {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:${DEFAULT_PORT}`;
    }
  }

  // 3. Android emulator loopback
  if (Platform.OS === 'android') {
    // If running on actual physical device or Wi-Fi, use LAN IP
    return `http://${DEFAULT_LAN_HOST}:${DEFAULT_PORT}`;
  }

  return `http://127.0.0.1:${DEFAULT_PORT}`;
}

let currentBaseUrl = resolveDefaultBaseUrl();

// Automatically load any saved custom URL from AsyncStorage on app startup
AsyncStorage.getItem(STORAGE_KEYS.SETTINGS('1001')).then((json) => {
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (parsed.customApiUrl && parsed.customApiUrl.trim()) {
        currentBaseUrl = parsed.customApiUrl.trim().replace(/\/+$/, '');
        console.log(`🌐 [ORCA API] Loaded custom backend URL: ${currentBaseUrl}`);
      }
    } catch {}
  }
}).catch(() => {});

export const API_BASE_URL = currentBaseUrl;

export function getBaseUrl() {
  return currentBaseUrl;
}

export function setBaseUrl(newUrl) {
  if (newUrl && typeof newUrl === 'string') {
    currentBaseUrl = newUrl.trim().replace(/\/+$/, '');
    console.log(`🌐 [ORCA API] Base URL updated to: ${currentBaseUrl}`);
  }
}

export function getEndpoint(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${currentBaseUrl}${cleanPath}`;
}

export const ENDPOINTS = {
  HEALTH: '/',
  CHAT: '/api/chat',
  CHAT_STREAM: '/api/chat/stream',
  VOICE_TRANSCRIBE: '/api/voice/transcribe',
  VOICE_TTS: '/api/voice/tts',
  VESSELS: '/api/vessels',
  WEATHER: '/api/weather',
  SAFETY: '/api/safety/conditions',
};

export default {
  API_BASE_URL,
  getBaseUrl,
  setBaseUrl,
  getEndpoint,
  ENDPOINTS,
};
