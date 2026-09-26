import { getTranslation, LANGUAGES } from './translations';
import { getSettings, saveSettings } from '../storage/settingsStorage';

let currentLanguage = 'en';
const listeners = new Set();

// Initialize from stored settings
getSettings().then((s) => {
  if (s?.language) {
    currentLanguage = s.language;
    notifyListeners();
  }
});

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(currentLanguage);
    } catch (e) {
      console.warn('Language listener error:', e);
    }
  });
}

/**
 * Universal translation function.
 * @param {string} text - English text or phrase key
 * @param {string} [lang] - Language code (defaults to active currentLanguage)
 * @param {string} [fallback] - Fallback text if not found
 * @returns {string} Translated phrase
 */
export function t(text, lang = null, fallback = '') {
  const targetLang = lang || currentLanguage || 'en';
  return getTranslation(text, targetLang, fallback);
}

/**
 * Gets the current active language code.
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Sets the active application language across the app and persists to storage.
 */
export async function setAppLanguage(langCode) {
  if (!langCode || langCode === currentLanguage) return;
  currentLanguage = langCode;
  notifyListeners();
  await saveSettings({ language: langCode });
}

/**
 * Subscribes to global language changes.
 */
export function subscribeLanguage(callback) {
  listeners.add(callback);
  callback(currentLanguage);
  return () => {
    listeners.delete(callback);
  };
}

export { LANGUAGES };
export default {
  t,
  LANGUAGES,
  getCurrentLanguage,
  setAppLanguage,
  subscribeLanguage,
};
