import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  clearAllConversations,
  searchConversations,
} from '../storage/chatStorage';
import { getActiveUserId } from '../storage/settingsStorage';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState('1001');

  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  // Sync active user ID once on mount
  useEffect(() => {
    let isMounted = true;
    getActiveUserId().then((id) => {
      if (isMounted && id && id !== userIdRef.current) {
        setUserId(id);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const loadList = useCallback(async (uid, query = '') => {
    try {
      setLoading(true);
      const targetUser = uid || userIdRef.current;
      let list;
      if (query && query.trim()) {
        list = await searchConversations(query, targetUser);
      } else {
        list = await getConversations(targetUser);
      }
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search or user change
  useEffect(() => {
    loadList(userId, searchQuery);
  }, [userId, searchQuery, loadList]);

  // Guaranteed stable refresh function that never changes on every render
  const refresh = useCallback(() => {
    return loadList(userIdRef.current, searchQueryRef.current);
  }, [loadList]);

  const handleCreate = useCallback(async (initialQuery = '') => {
    const newChat = await createConversation(initialQuery, userIdRef.current);
    await loadList(userIdRef.current, searchQueryRef.current);
    return newChat;
  }, [loadList]);

  const handleRename = useCallback(async (id, newTitle) => {
    const success = await renameConversation(id, newTitle, userIdRef.current);
    if (success) {
      await loadList(userIdRef.current, searchQueryRef.current);
    }
    return success;
  }, [loadList]);

  const handleDelete = useCallback(async (id) => {
    const success = await deleteConversation(id, userIdRef.current);
    if (success) {
      await loadList(userIdRef.current, searchQueryRef.current);
    }
    return success;
  }, [loadList]);

  const handleClearAll = useCallback(async () => {
    const success = await clearAllConversations(userIdRef.current);
    if (success) {
      setConversations([]);
    }
    return success;
  }, []);

  return {
    conversations,
    loading,
    searchQuery,
    setSearchQuery,
    userId,
    refresh,
    createNewChat: handleCreate,
    renameChat: handleRename,
    deleteChat: handleDelete,
    clearAllChats: handleClearAll,
  };
}

export default useConversations;
