import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_USER_ID, DEFAULT_LANGUAGE, DEFAULT_VESSEL } from '../constants/config';
import { setBaseUrl } from '../config/api';

const DEFAULT_SETTINGS = {
  userId: DEFAULT_USER_ID,
  language: DEFAULT_LANGUAGE,
  vesselType: DEFAULT_VESSEL,
  storageTier: 'standard', // 'compact', 'standard', 'large', 'unlimited'
  customApiUrl: '',
  audioPlaybackEnabled: true,
};

/**
 * Retrieves settings for a given user.
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<Object>}
 */
export async function getSettings(userId = DEFAULT_USER_ID) {
  try {
    const key = STORAGE_KEYS.SETTINGS(userId);
    const json = await AsyncStorage.getItem(key);
    if (!json) return { ...DEFAULT_SETTINGS, userId };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json), userId };
  } catch (err) {
    console.error('Failed to load settings:', err);
    return { ...DEFAULT_SETTINGS, userId };
  }
}

/**
 * Saves or updates settings for a user.
 * @param {Object} partialSettings
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<Object>}
 */
export async function saveSettings(partialSettings, userId = DEFAULT_USER_ID) {
  try {
    const current = await getSettings(userId);
    const updated = { ...current, ...partialSettings, userId };
    const key = STORAGE_KEYS.SETTINGS(userId);
    await AsyncStorage.setItem(key, JSON.stringify(updated));

    // If custom API URL changed, update runtime base URL
    if (updated.customApiUrl) {
      setBaseUrl(updated.customApiUrl);
    }

    return updated;
  } catch (err) {
    console.error('Failed to save settings:', err);
    throw err;
  }
}

/**
 * Gets the active user ID across app restarts.
 * @returns {Promise<string>}
 */
export async function getActiveUserId() {
  try {
    const id = await AsyncStorage.getItem(STORAGE_KEYS.USER_ACTIVE_ID);
    return id || DEFAULT_USER_ID;
  } catch {
    return DEFAULT_USER_ID;
  }
}

/**
 * Sets the active user ID.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function setActiveUserId(userId) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ACTIVE_ID, String(userId));
  } catch (err) {
    console.error('Failed to set active user ID:', err);
  }
}

export default {
  getSettings,
  saveSettings,
  getActiveUserId,
  setActiveUserId,
  DEFAULT_SETTINGS,
};
