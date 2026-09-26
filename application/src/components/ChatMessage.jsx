import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { formatTime } from '../utils/dateUtils';
import { parseResponseIndicators } from '../utils/messageUtils';
import ORCAAvatar from './ORCAAvatar';
import MarineVerdictBadge from './MarineVerdictBadge';
import EvidenceCard from './EvidenceCard';
import MessageActions from './MessageActions';
import MarkdownMessage from './MarkdownMessage';
import { t } from '../i18n';

export const ChatMessage = memo(function ChatMessage({
  message,
  onSpeak,
  isSpeaking = false,
  onRegenerate,
  language = 'en',
}) {
  const isUser = message.role === 'user';
  const timestamp = formatTime(message.timestamp);

  // Parse structured marine indicators (verdict, confidence, risk) without changing raw text
  const { text, verdict, confidence, riskScore } = parseResponseIndicators(
    message.content,
    message.metadata
  );

  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubbleWrapper}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{message.content}</Text>
          </View>
          {timestamp ? <Text style={styles.userTimestamp}>{timestamp}</Text> : null}
        </View>
      </View>
    );
  }

  // Assistant: Web Claude/ChatGPT styled White Card with Navy & Ocean Blue accents
  return (
    <View style={styles.assistantContainer}>
      <View style={styles.assistantHeader}>
        <View style={styles.authorBadge}>
          <ORCAAvatar size={26} showAura={false} />
          <Text style={styles.assistantName}>ORCA</Text>
          <View style={styles.aiTag}>
            <Text style={styles.aiTagText}>AI</Text>
          </View>
          {isSpeaking && (
            <View style={styles.speakingBadge}>
              <View style={styles.speakingDot} />
              <Text style={styles.speakingText}>{t('Speaking', language, 'Speaking')}</Text>
            </View>
          )}
        </View>
        {timestamp ? <Text style={styles.assistantTimestamp}>{timestamp}</Text> : null}
      </View>

      {/* Operational Verdict Status Pill (if present) */}
      <MarineVerdictBadge
        verdict={verdict}
        confidence={confidence}
        riskScore={riskScore}
        language={language}
      />

      {/* Exact Unmodified ORCA Markdown Content */}
      <View style={styles.markdownWrapper}>
        <MarkdownMessage content={text} />
      </View>

      {/* Expandable Multi-Agent Pipeline Trace */}
      {message.metadata?.agent_pipeline && (
        <EvidenceCard pipeline={message.metadata.agent_pipeline} language={language} />
      )}

      {/* Message Actions (Copy, Share, Audio, Retry) */}
      <MessageActions
        content={text}
        onSpeak={onSpeak}
        isSpeaking={isSpeaking}
        onRegenerate={onRegenerate}
        isAssistant={true}
        language={language}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  // User Styles (Deep Navy Bubble matching Web)
  userContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: spacing.xs + 2,
    paddingHorizontal: spacing.base,
  },
  userBubbleWrapper: {
    maxWidth: '84%',
    alignItems: 'flex-end',
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderRadius: spacing.radius.lg,
    borderBottomRightRadius: spacing.radius.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    ...spacing.shadows.subtle,
  },
  userText: {
    color: colors.userBubbleText,
    fontSize: typography.sizes.sm + 1,
    lineHeight: typography.lineHeights.base,
    fontWeight: typography.weights.medium,
  },
  userTimestamp: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
    marginRight: 2,
  },

  // Assistant Styles (White Card matching Web Bubble)
  assistantContainer: {
    marginVertical: spacing.xs + 3,
    marginHorizontal: spacing.base,
    padding: spacing.base - 2,
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.xl,
    ...spacing.shadows.card,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.xs,
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  assistantName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.black,
    color: colors.textHeading,
    letterSpacing: 0.3,
  },
  aiTag: {
    backgroundColor: colors.accentSubtle,
    borderColor: colors.borderCyan,
    borderWidth: 1,
    borderRadius: spacing.radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  aiTagText: {
    fontSize: 9.5,
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  speakingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSubtle,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: spacing.radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  speakingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  speakingText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  assistantTimestamp: {
    fontSize: 10,
    color: colors.textMuted,
  },
  markdownWrapper: {
    marginVertical: spacing.xs,
  },
});

export default ChatMessage;
