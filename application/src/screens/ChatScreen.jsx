import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useChat } from '../hooks/useChat';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import Header from '../components/Header';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import AgentLiveLoading from '../components/AgentLiveLoading';
import TypingIndicator from '../components/TypingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { t } from '../i18n';

export function ChatScreen({ route, navigation }) {
  const { conversationId, initialQuery } = route.params || {};

  const flatListRef = useRef(null);
  const initialSentRef = useRef(false);

  const {
    conversation,
    messages,
    isResponding,
    error,
    language,
    setLanguage,
    sendMessage,
    retryLastMessage,
    cancelRequest,
  } = useChat(conversationId);

  // Mobile Voice Integration via Faster-Whisper ASR
  const {
    isRecording,
    isTranscribing,
    durationSec,
    isPlayingAudio,
    startRecording,
    stopRecording,
    cancelRecording,
    speakText,
    stopSpeaking,
  } = useVoiceRecorder({
    onTranscribed: ({ text, language: detectedLang }) => {
      if (text) {
        sendMessage(text, { language: detectedLang || language });
      }
    },
    onError: (errText) => {
      console.warn('Voice recording error:', errText);
    },
  });

  // Automatically submit initial query if navigated from Home starter chips
  useEffect(() => {
    if (initialQuery && !initialSentRef.current && messages.length === 0) {
      initialSentRef.current = true;
      sendMessage(initialQuery, { language });
    }
  }, [initialQuery, messages.length, sendMessage, language]);

  // Scroll to bottom on new messages or typing
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages.length, isResponding]);

  // Identify last user query to dynamically specialize multi-agent swarm preview
  const lastUserQuery = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') {
        return messages[i].content;
      }
    }
    return initialQuery || '';
  }, [messages, initialQuery]);

  const handleSend = useCallback(
    (text, extra = {}) => {
      sendMessage(text, { language, ...extra });
    },
    [sendMessage, language]
  );

  const handleNewChat = useCallback(() => {
    navigation.replace('Chat', { conversationId: null, initialQuery: null });
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }) => (
      <ChatMessage
        message={item}
        language={language}
        onSpeak={() => {
          if (isPlayingAudio) stopSpeaking();
          else speakText(item.content, language);
        }}
        isSpeaking={isPlayingAudio}
        onRegenerate={retryLastMessage}
      />
    ),
    [isPlayingAudio, language, retryLastMessage, speakText, stopSpeaking]
  );

  const keyExtractor = useCallback((item, index) => item.id || `msg-${index}`, []);

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />

      {/* Top Marine Header with Safe Top Padding */}
      <Header
        title={conversation?.title ? t(conversation.title, language, conversation.title) : t('ORCA Consultation', language, 'ORCA Consultation')}
        subtitle={t('Live Multi-Agent Reasoning', language, 'Live Multi-Agent Reasoning')}
        languageCode={language}
        onSelectLanguage={(l) => setLanguage && setLanguage(l)}
        onBack={() => navigation.goBack()}
        onNewChat={handleNewChat}
        onOpenHistory={() => navigation.navigate('History')}
        onOpenSettings={() => navigation.navigate('Settings')}
      />

      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Virtualized Message List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <EmptyState
                language={language}
                onSelectPrompt={(query) => {
                  sendMessage(query, { language });
                }}
              />
            }
            ListFooterComponent={
              <View>
                {isResponding && (
                  <AgentLiveLoading
                    queryText={lastUserQuery}
                    statusText={t('ORCA agents verifying satellite and sea conditions...', language, 'ORCA agents verifying satellite and sea conditions...')}
                    language={language}
                    onCancel={cancelRequest}
                  />
                )}
                {error && (
                  <ErrorMessage
                    message={error}
                    language={language}
                    onRetry={retryLastMessage}
                  />
                )}
              </View>
            }
          />

          {/* Unified Voice & Text Marine Input Bar */}
          <ChatInput
            onSend={handleSend}
            disabled={isResponding}
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            recordingDuration={durationSec}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onCancelRecording={cancelRecording}
            language={language}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 12,
  },
});

export default ChatScreen;
