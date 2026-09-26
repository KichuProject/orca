import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import ORCAAvatar from './ORCAAvatar';
import { STARTER_PROMPTS } from '../constants/starterPrompts';
import { t } from '../i18n';

export function EmptyState({ onSelectPrompt, language = 'en', style }) {
  return (
    <View style={[styles.container, style]}>
      {/* Hero Marine Emblem */}
      <View style={styles.heroSection}>
        <ORCAAvatar size={64} showAura={true} />
        <Text style={styles.heroTitle}>ORCA</Text>
        <Text style={styles.heroSubtitle}>
          {t('Oceanographic AI & Maritime Safety Platform', language)}
        </Text>
        <Text style={styles.greetingText}>
          {t('Good day, Captain. What would you like to know about the sea?', language, 'Good day, Captain. What would you like to know about the sea?')}
        </Text>
      </View>

      {/* Starter Marine Questions Grid */}
      <View style={styles.promptsContainer}>
        <Text style={styles.promptsHeader}>
          {t('QUICK MARITIME ADVISORIES', language, 'QUICK MARITIME ADVISORIES')}
        </Text>
        <View style={styles.promptList}>
          {STARTER_PROMPTS.slice(0, 4).map((p) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.7}
              onPress={() => onSelectPrompt && onSelectPrompt(p.query)}
              style={styles.promptCard}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Feather name={p.icon || 'compass'} size={15} color={colors.primary} />
                </View>
                <Text style={styles.promptTitle}>{t(p.title, language, p.title)}</Text>
              </View>
              <Text style={styles.promptSubtitle}>{t(p.subtitle, language, p.subtitle)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.black,
    color: colors.textHeading,
    letterSpacing: 1.5,
    marginTop: spacing.md,
  },
  heroSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  greetingText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: typography.lineHeights.base,
    maxWidth: 300,
  },
  promptsContainer: {
    width: '100%',
    marginTop: spacing.xs,
  },
  promptsHeader: {
    fontSize: 11,
    fontWeight: typography.weights.black,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  promptList: {
    gap: spacing.sm,
  },
  promptCard: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    ...spacing.shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTitle: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.bold,
    color: colors.textHeading,
  },
  promptSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
    marginLeft: 36,
  },
});

export default EmptyState;
