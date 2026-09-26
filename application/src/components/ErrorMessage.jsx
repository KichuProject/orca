import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { t } from '../i18n';

export function ErrorMessage({ message, onRetry, language = 'en', style }) {
  if (!message) return null;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.contentRow}>
        <Feather name="alert-circle" size={18} color={colors.danger} style={styles.icon} />
        <View style={styles.textColumn}>
          <Text style={styles.title}>{t('Connection Interrupted', language, 'Connection Interrupted')}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>

      {onRetry && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Feather name="refresh-cw" size={13} color={colors.white} />
          <Text style={styles.retryText}>{t('Retry Query', language, 'Retry Query')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.danger,
    marginBottom: 2,
  },
  message: {
    fontSize: typography.sizes.xs + 1,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.radius.md,
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  retryText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
});

export default ErrorMessage;
