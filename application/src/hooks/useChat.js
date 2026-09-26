import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getConversationById,
  saveConversation,
  generateId,
  generateTitleFromQuery,
} from '../storage/chatStorage';
import { getSettings } from '../storage/settingsStorage';
import { sendChatMessage } from '../api/chatApi';
import { getCoordinates } from '../services/locationService';
import { getCurrentLanguage, subscribeLanguage, setAppLanguage } from '../i18n';

export function useChat(conversationId, initialUserId = '1001') {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(initialUserId);
  const [language, setLanguage] = useState(getCurrentLanguage() || 'en');

  // Reactively track global language changes
  useEffect(() => {
    const unsub = subscribeLanguage((lang) => {
      setLanguage(lang);
    });
    return () => unsub();
  }, []);

  const changeLanguage = useCallback((newLang) => {
    setLanguage(newLang);
    setAppLanguage(newLang);
  }, []);

  const abortControllerRef = useRef(null);

  // Load conversation on mount or when conversationId changes
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const settings = await getSettings(userId);
        if (isMounted) {
          setLanguage(settings.language || 'en');
        }

        if (conversationId) {
          const chat = await getConversationById(conversationId, userId);
          if (isMounted && chat) {
            setConversation(chat);
            setMessages(chat.messages || []);
            return;
          }
        }

        // Initialize transient placeholder for a brand new conversation
        if (isMounted) {
          const newPlaceholder = {
            id: conversationId || generateId('chat'),
            title: 'New Consultation',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId,
            messages: [],
          };
          setConversation(newPlaceholder);
          setMessages([]);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load chat conversation:', err);
          setError('Failed to load conversation history.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [conversationId, userId]);

  /**
   * Submits a user message to the existing ORCA FastAPI backend.
   * @param {string} text
   * @param {Object} [options]
   */
  const sendMessage = useCallback(
    async (text, options = {}) => {
      const cleanText = (text || '').trim();
      if (!cleanText || isResponding) return;

      setError(null);
      setIsResponding(true);

      const userMsg = {
        id: generateId('msg_user'),
        role: 'user',
        content: cleanText,
        timestamp: new Date().toISOString(),
      };

      // Auto-generate title if this is the first turn
      const updatedTitle =
        messages.length === 0 || conversation?.title === 'New Consultation'
          ? generateTitleFromQuery(cleanText)
          : conversation?.title;

      const currentMessages = [...messages, userMsg];
      setMessages(currentMessages);

      const activeChat = {
        ...(conversation || {}),
        id: conversation?.id || conversationId || generateId('chat'),
        title: updatedTitle,
        updatedAt: new Date().toISOString(),
        userId,
        messages: currentMessages,
      };
      setConversation(activeChat);

      // Persist immediately so message is never lost even if network crashes
      try {
        await saveConversation(activeChat, userId);
      } catch (e) {
        console.warn('Storage save warning:', e);
      }

      // Prepare request payload for backend
      abortControllerRef.current = new AbortController();

      try {
        const coords = (options.lat != null && options.lon != null)
          ? { latitude: options.lat, longitude: options.lon }
          : await getCoordinates();
        const settings = await getSettings(userId);
        const targetLang = options.language || language || settings.language || 'en';

        // Prepare previous conversational context
        const historyPayload = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const data = await sendChatMessage({
          message: cleanText,
          lat: options.lat != null ? options.lat : coords.latitude,
          lon: options.lon != null ? options.lon : coords.longitude,
          vessel_type: settings.vesselType || 'fishing_trawler',
          user_id: userId,
          language: targetLang,
          history: historyPayload,
          signal: abortControllerRef.current.signal,
        });

        // EXACT ORCA response: No summarization, no paraphrase
        const exactResponseText = data.response || 'No response returned from ORCA.';

        const assistantMsg = {
          id: generateId('msg_ast'),
          role: 'assistant',
          content: exactResponseText,
          timestamp: data.timestamp || new Date().toISOString(),
          metadata: {
            agent_pipeline: data.agent_pipeline || null,
            short_answer: data.short_answer || '',
            user_id: data.user_id || userId,
          },
        };

        const finalMessages = [...currentMessages, assistantMsg];
        setMessages(finalMessages);

        const finalizedChat = {
          ...activeChat,
          messages: finalMessages,
          updatedAt: new Date().toISOString(),
        };
        setConversation(finalizedChat);
        await saveConversation(finalizedChat, userId);

        return assistantMsg;
      } catch (err) {
        if (err.name === 'CanceledError' || err.message?.includes('aborted')) {
          console.log('User canceled ORCA request.');
          return;
        }

        console.error('Chat error:', err);
        setError(err.message || 'ORCA could not connect right now.');
      } finally {
        setIsResponding(false);
        abortControllerRef.current = null;
      }
    },
    [conversation, conversationId, isResponding, language, messages, userId]
  );

  /**
   * Retries the last failed user message without duplicating it.
   */
  const retryLastMessage = useCallback(async () => {
    if (messages.length === 0) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    // Pop any trailing assistant error message if present
    const cleaned = messages.filter((m, idx) => {
      if (idx === messages.length - 1 && m.role === 'assistant' && !m.content) return false;
      return true;
    });

    setMessages(cleaned);
    await sendMessage(lastUserMsg.content);
  }, [messages, sendMessage]);

  /**
   * Cancels any active HTTP request.
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsResponding(false);
    }
  }, []);

  return {
    conversation,
    messages,
    isLoading,
    isResponding,
    error,
    language,
    setLanguage: changeLanguage,
    sendMessage,
    retryLastMessage,
    cancelRequest,
  };
}

export default useChat;
