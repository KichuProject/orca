/**
 * ORCA Application Constants & Storage Policies
 */

export const DEFAULT_COORDINATES = {
  latitude: 13.0827,
  longitude: 80.2707,
  name: 'Chennai Coast, Bay of Bengal',
};

export const DEFAULT_VESSEL = 'fishing_trawler';
export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_USER_ID = '1001';

// Supported Multilingual Coastal Interface
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
];

// Configurable User-Specific Storage Quotas (Section 9 Requirement)
export const STORAGE_TIERS = {
  compact: {
    id: 'compact',
    label: 'Compact',
    description: 'Up to 20 conversations, max 60 messages per chat',
    maxConversations: 20,
    maxMessagesPerChat: 60,
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    description: 'Up to 60 conversations, max 150 messages per chat',
    maxConversations: 60,
    maxMessagesPerChat: 150,
  },
  large: {
    id: 'large',
    label: 'Large Intelligence Cache',
    description: 'Up to 200 conversations, max 400 messages per chat',
    maxConversations: 200,
    maxMessagesPerChat: 400,
  },
  unlimited: {
    id: 'unlimited',
    label: 'Extended Enterprise Archive',
    description: 'Unlimited persistent chat memory',
    maxConversations: 10000,
    maxMessagesPerChat: 10000,
  },
};

export const STORAGE_KEYS = {
  USER_ACTIVE_ID: '@orca_active_user_id',
  CONVERSATIONS: (userId) => `@orca_user_${userId || DEFAULT_USER_ID}_conversations`,
  SETTINGS: (userId) => `@orca_user_${userId || DEFAULT_USER_ID}_settings`,
  CUSTOM_API_URL: '@orca_custom_api_url',
};

export default {
  DEFAULT_COORDINATES,
  DEFAULT_VESSEL,
  DEFAULT_LANGUAGE,
  DEFAULT_USER_ID,
  SUPPORTED_LANGUAGES,
  STORAGE_TIERS,
  STORAGE_KEYS,
};
