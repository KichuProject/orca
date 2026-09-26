import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { formatRelativeTime } from '../utils/dateUtils';
import { t } from '../i18n';

export function ConversationItem({
  conversation,
  onPress,
  onRename,
  onDelete,
  isActive = false,
  language = 'en',
}) {
  const lastMessage =
    conversation.messages && conversation.messages.length > 0
      ? conversation.messages[conversation.messages.length - 1]
      : null;

  const timeLabel = formatRelativeTime(conversation.updatedAt || conversation.createdAt);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress && onPress(conversation)}
      style={[styles.container, isActive && styles.containerActive]}
    >
      <View style={styles.iconColumn}>
        <View style={[styles.iconCircle, isActive && styles.iconCircleActive]}>
          <Feather
            name="message-square"
            size={16}
            color={isActive ? colors.accent : colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.contentColumn}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isActive && styles.titleActive]} numberOfLines={1}>
            {conversation.title ? t(conversation.title, language, conversation.title) : t('Marine Consultation', language, 'Marine Consultation')}
          </Text>
          <Text style={styles.timestamp}>{timeLabel}</Text>
        </View>

        {lastMessage ? (
          <Text style={styles.snippet} numberOfLines={2}>
            {lastMessage.content}
          </Text>
        ) : (
          <Text style={styles.snippetEmpty}>{t('No messages yet', language, 'No messages yet')}</Text>
        )}
      </View>

      {/* Action buttons (Rename, Delete) */}
      <View style={styles.actionsColumn}>
        {onRename && (
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={(e) => {
              e.stopPropagation();
              onRename(conversation);
            }}
            style={styles.actionBtn}
            accessibilityLabel="Rename conversation"
          >
            <Feather name="edit-2" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {onDelete && (
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={(e) => {
              e.stopPropagation();
              onDelete(conversation);
            }}
            style={styles.actionBtn}
            accessibilityLabel="Delete conversation"
          >
            <Feather name="trash-2" size={14} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginVertical: 4,
    marginHorizontal: spacing.base,
    gap: spacing.md,
  },
  containerActive: {
    borderColor: colors.borderCyan,
    backgroundColor: colors.surfaceElevated,
  },
  iconColumn: {
    justifyContent: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.accentSubtle,
  },
  contentColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.semibold,
    color: colors.textHeading,
    flex: 1,
    marginRight: spacing.sm,
  },
  titleActive: {
    color: colors.accent,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textMuted,
  },
  snippet: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  snippetEmpty: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  actionsColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionBtn: {
    padding: 4,
  },
});

export default ConversationItem;
