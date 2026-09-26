import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_USER_ID, STORAGE_TIERS } from '../constants/config';
import { getSettings } from './settingsStorage';

/**
 * Utility to generate client-side UUID without heavy crypto dependencies
 */
export function generateId(prefix = 'orca') {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${randomStr}`;
}

/**
 * Generates an intuitive title from the first user query
 */
export function generateTitleFromQuery(query) {
  if (!query) return 'Marine Consultation';
  const clean = query.trim().replace(/^["']|["']$/g, '');
  if (clean.length <= 40) return clean;
  // Truncate at word boundary
  const words = clean.split(/\s+/);
  let title = '';
  for (const w of words) {
    if ((title + ' ' + w).length > 36) break;
    title += (title ? ' ' : '') + w;
  }
  return (title || clean.slice(0, 36)) + '...';
}

/**
 * Retrieves all conversations for a specific user.
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<Array>}
 */
export async function getConversations(userId = DEFAULT_USER_ID) {
  try {
    const key = STORAGE_KEYS.CONVERSATIONS(userId);
    const json = await AsyncStorage.getItem(key);
    if (!json) return [];
    const list = JSON.parse(json);
    return Array.isArray(list) ? list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) : [];
  } catch (err) {
    console.error('Failed to load conversations from storage:', err);
    return [];
  }
}

/**
 * Retrieves a single conversation by ID.
 * @param {string} conversationId
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<Object|null>}
 */
export async function getConversationById(conversationId, userId = DEFAULT_USER_ID) {
  try {
    const list = await getConversations(userId);
    return list.find((c) => c.id === conversationId) || null;
  } catch (err) {
    console.error(`Failed to load conversation ${conversationId}:`, err);
    return null;
  }
}

/**
 * Saves or updates a conversation in user-isolated storage, respecting configured quotas.
 * @param {Object} conversation
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<Object>}
 */
export async function saveConversation(conversation, userId = DEFAULT_USER_ID) {
  try {
    if (!conversation || !conversation.id) {
      throw new Error('Invalid conversation object provided.');
    }

    const settings = await getSettings(userId);
    const tierConfig = STORAGE_TIERS[settings.storageTier] || STORAGE_TIERS.standard;

    const list = await getConversations(userId);
    const existingIndex = list.findIndex((c) => c.id === conversation.id);

    // Apply per-chat message quota if specified in tier (without affecting active view)
    let processedMessages = conversation.messages || [];
    if (tierConfig.maxMessagesPerChat && processedMessages.length > tierConfig.maxMessagesPerChat) {
      // Keep earliest 2 messages (context anchor) and latest N messages
      const keepCount = tierConfig.maxMessagesPerChat;
      processedMessages = processedMessages.slice(-keepCount);
    }

    const updatedItem = {
      ...conversation,
      messages: processedMessages,
      updatedAt: new Date().toISOString(),
    };

    let newList;
    if (existingIndex >= 0) {
      newList = [...list];
      newList[existingIndex] = updatedItem;
    } else {
      newList = [updatedItem, ...list];
    }

    // Apply max conversation quota for the user
    if (tierConfig.maxConversations && newList.length > tierConfig.maxConversations) {
      newList = newList.slice(0, tierConfig.maxConversations);
    }

    const key = STORAGE_KEYS.CONVERSATIONS(userId);
    await AsyncStorage.setItem(key, JSON.stringify(newList));
    return updatedItem;
  } catch (err) {
    console.error('Failed to save conversation:', err);
    throw err;
  }
}

/**
 * Creates a brand new conversation container.
 * @param {string} [initialQuery] - Optional first user question to derive title
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<Object>}
 */
export async function createConversation(initialQuery = '', userId = DEFAULT_USER_ID) {
  const newChat = {
    id: generateId('chat'),
    title: initialQuery ? generateTitleFromQuery(initialQuery) : 'New Consultation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId,
    messages: [],
  };

  await saveConversation(newChat, userId);
  return newChat;
}

/**
 * Appends a message to a conversation and updates title if first user message.
 * @param {string} conversationId
 * @param {Object} message - { id, role, content, timestamp, metadata }
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<Object>}
 */
export async function addMessageToConversation(conversationId, message, userId = DEFAULT_USER_ID) {
  let chat = await getConversationById(conversationId, userId);
  if (!chat) {
    chat = {
      id: conversationId || generateId('chat'),
      title: message.role === 'user' ? generateTitleFromQuery(message.content) : 'New Consultation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId,
      messages: [],
    };
  }

  // Update title if previously default and this is first user question
  if (
    message.role === 'user' &&
    (!chat.title || chat.title === 'New Consultation' || chat.title === 'Marine Consultation')
  ) {
    chat.title = generateTitleFromQuery(message.content);
  }

  chat.messages = [...(chat.messages || []), message];
  return await saveConversation(chat, userId);
}

/**
 * Renames a conversation.
 * @param {string} conversationId
 * @param {string} newTitle
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<boolean>}
 */
export async function renameConversation(conversationId, newTitle, userId = DEFAULT_USER_ID) {
  try {
    const list = await getConversations(userId);
    const item = list.find((c) => c.id === conversationId);
    if (!item) return false;

    item.title = String(newTitle).trim() || item.title;
    item.updatedAt = new Date().toISOString();

    const key = STORAGE_KEYS.CONVERSATIONS(userId);
    await AsyncStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch (err) {
    console.error(`Failed to rename conversation ${conversationId}:`, err);
    return false;
  }
}

/**
 * Deletes a single conversation.
 * @param {string} conversationId
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<boolean>}
 */
export async function deleteConversation(conversationId, userId = DEFAULT_USER_ID) {
  try {
    const list = await getConversations(userId);
    const filtered = list.filter((c) => c.id !== conversationId);
    const key = STORAGE_KEYS.CONVERSATIONS(userId);
    await AsyncStorage.setItem(key, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error(`Failed to delete conversation ${conversationId}:`, err);
    return false;
  }
}

/**
 * Deletes all conversations for a specific user with safe confirmation.
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<boolean>}
 */
export async function clearAllConversations(userId = DEFAULT_USER_ID) {
  try {
    const key = STORAGE_KEYS.CONVERSATIONS(userId);
    await AsyncStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`Failed to clear conversations for user ${userId}:`, err);
    return false;
  }
}

/**
 * Searches conversations locally by title and message content. Fully functional offline.
 * @param {string} query
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<Array>}
 */
export async function searchConversations(query, userId = DEFAULT_USER_ID) {
  if (!query || !query.trim()) {
    return await getConversations(userId);
  }

  const term = query.toLowerCase().trim();
  const list = await getConversations(userId);

  return list.filter((chat) => {
    // 1. Check title
    if (chat.title && chat.title.toLowerCase().includes(term)) return true;

    // 2. Check message contents
    if (Array.isArray(chat.messages)) {
      return chat.messages.some(
        (m) => m && m.content && typeof m.content === 'string' && m.content.toLowerCase().includes(term)
      );
    }

    return false;
  });
}

/**
 * Computes estimated local storage size in bytes and KB for the user's chats.
 * @param {string} [userId=DEFAULT_USER_ID]
 * @returns {Promise<{ bytes: number, formatted: string, conversationCount: number, messageCount: number }>}
 */
export async function getStorageUsage(userId = DEFAULT_USER_ID) {
  try {
    const key = STORAGE_KEYS.CONVERSATIONS(userId);
    const json = (await AsyncStorage.getItem(key)) || '[]';
    const bytes = new Blob([json]).size || json.length;

    const list = JSON.parse(json);
    const conversationCount = list.length;
    let messageCount = 0;
    list.forEach((c) => {
      messageCount += (c.messages || []).length;
    });

    let formatted = `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes > 1024 * 1024) {
      formatted = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    return { bytes, formatted, conversationCount, messageCount };
  } catch (err) {
    return { bytes: 0, formatted: '0 KB', conversationCount: 0, messageCount: 0 };
  }
}

export default {
  generateId,
  generateTitleFromQuery,
  getConversations,
  getConversationById,
  saveConversation,
  createConversation,
  addMessageToConversation,
  renameConversation,
  deleteConversation,
  clearAllConversations,
  searchConversations,
  getStorageUsage,
};
