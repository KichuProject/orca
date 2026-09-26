import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { t } from '../i18n';

export function MessageActions({
  content,
  onSpeak,
  isSpeaking = false,
  onRegenerate,
  isAssistant = true,
  language = 'en',
  style,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await Clipboard.setStringAsync(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy error:', err);
    }
  };

  const handleShare = async () => {
    if (!content) return;
    try {
      await Share.share({
        message: content,
        title: 'ORCA Marine Intelligence Advisory',
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Copy Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleCopy}
        style={styles.actionBtn}
        accessibilityLabel="Copy message text"
      >
        <Feather
          name={copied ? 'check' : 'copy'}
          size={13}
          color={copied ? colors.safe : colors.textSecondary}
        />
        <Text style={[styles.actionText, copied && { color: colors.safe }]}>
          {copied ? t('Copied', language, 'Copied') : t('Copy', language, 'Copy')}
        </Text>
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleShare}
        style={styles.actionBtn}
        accessibilityLabel="Share response"
      >
        <Feather name="share-2" size={13} color={colors.textSecondary} />
        <Text style={styles.actionText}>{t('Share', language, 'Share')}</Text>
      </TouchableOpacity>

      {/* Audio Listen Button (Assistant only) */}
      {isAssistant && onSpeak && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onSpeak}
          style={[styles.actionBtn, isSpeaking && styles.actionBtnActive]}
          accessibilityLabel="Read aloud with speech audio"
        >
          <Feather
            name={isSpeaking ? 'volume-x' : 'volume-2'}
            size={13}
            color={isSpeaking ? colors.accent : colors.textSecondary}
          />
          <Text style={[styles.actionText, isSpeaking && { color: colors.accent }]}>
            {isSpeaking ? t('Mute', language, 'Mute') : t('Listen', language, 'Listen')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Regenerate Button (Assistant only) */}
      {isAssistant && onRegenerate && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRegenerate}
          style={styles.actionBtn}
          accessibilityLabel="Regenerate this response"
        >
          <Feather name="refresh-cw" size={13} color={colors.textSecondary} />
          <Text style={styles.actionText}>{t('Retry', language, 'Retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
    marginTop: spacing.sm,
    paddingTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 34,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnActive: {
    borderColor: colors.borderCyan,
    backgroundColor: colors.accentSubtle,
  },
  actionText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
});

export default MessageActions;
