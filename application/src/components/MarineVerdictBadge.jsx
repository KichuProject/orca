import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { t } from '../i18n';

export function MarineVerdictBadge({ verdict, confidence, riskScore, language = 'en', style }) {
  if (!verdict && confidence == null && riskScore == null) return null;

  const isSafe = verdict?.type === 'safe';
  const isDanger = verdict?.type === 'danger';
  const isWarning = verdict?.type === 'warning';

  let badgeBg = colors.infoBg;
  let badgeBorder = colors.infoBorder;
  let textColor = colors.info;
  let iconName = 'info';

  if (isSafe) {
    badgeBg = colors.safeBg;
    badgeBorder = colors.safeBorder;
    textColor = colors.safe;
    iconName = 'check-circle';
  } else if (isDanger) {
    badgeBg = colors.dangerBg;
    badgeBorder = colors.dangerBorder;
    textColor = colors.danger;
    iconName = 'alert-octagon';
  } else if (isWarning) {
    badgeBg = colors.warningBg;
    badgeBorder = colors.warningBorder;
    textColor = colors.warning;
    iconName = 'alert-triangle';
  }

  return (
    <View style={[styles.container, style]}>
      {verdict && (
        <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
          <Feather name={iconName} size={14} color={textColor} style={styles.icon} />
          <Text style={[styles.label, { color: textColor }]}>
            {t('Verdict', language, 'VERDICT')}: {t(verdict.label, language, verdict.label)}
          </Text>
        </View>
      )}

      {confidence != null && (
        <View style={styles.metricPill}>
          <Text style={styles.metricKey}>{t('Confidence', language, 'Confidence')} </Text>
          <Text style={styles.metricVal}>{confidence}%</Text>
        </View>
      )}

      {riskScore != null && (
        <View style={styles.metricPill}>
          <Text style={styles.metricKey}>{t('Risk', language, 'Risk')} </Text>
          <Text style={[styles.metricVal, { color: riskScore > 60 ? colors.danger : riskScore > 30 ? colors.warning : colors.safe }]}>
            {riskScore}/100
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radius.pill,
    borderWidth: 1,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radius.pill,
  },
  metricKey: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  metricVal: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textHeading,
  },
});

export default MarineVerdictBadge;
