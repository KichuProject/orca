import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { t } from '../i18n';

export function EvidenceCard({ pipeline, language = 'en', style }) {
  const [expanded, setExpanded] = useState(false);

  if (!pipeline || typeof pipeline !== 'object') return null;

  const tools = Array.isArray(pipeline.tools_called) ? pipeline.tools_called : [];
  const intent = pipeline.intent || pipeline.planner_intent || '';
  const cycloneSafe = pipeline.cyclone_safe != null ? (pipeline.cyclone_safe ? t('Safe', language, 'Safe') : t('Active Warning', language, 'Active Warning')) : null;
  const executionTime = pipeline.execution_time_ms ? `${(pipeline.execution_time_ms / 1000).toFixed(2)}s` : null;

  if (!intent && tools.length === 0 && !cycloneSafe) return null;

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded(!expanded)}
        style={styles.headerRow}
      >
        <View style={styles.titleRow}>
          <Feather name="layers" size={13} color={colors.accent} style={styles.icon} />
          <Text style={styles.headerText}>{t('Multi-Agent Intelligence Audit', language, 'Multi-Agent Intelligence Audit')}</Text>
          {tools.length > 0 && (
            <View style={styles.toolCountBadge}>
              <Text style={styles.toolCountText}>{tools.length} {t('Agents', language, 'Agents')}</Text>
            </View>
          )}
        </View>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {intent ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{t('ORCA Intent Classification', language, 'ORCA Intent Classification')}</Text>
              <Text style={styles.fieldVal}>{intent}</Text>
            </View>
          ) : null}

          {tools.length > 0 && (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{t('Collaborative Agents Executed', language, 'Collaborative Agents Executed')}</Text>
              <View style={styles.agentTagList}>
                {tools.map((tag, idx) => (
                  <View key={idx} style={styles.agentTag}>
                    <Text style={styles.agentTagText}>{String(tag).replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.footerRow}>
            {cycloneSafe && (
              <Text style={styles.metaText}>
                {t('Cyclone Status', language, 'Cyclone Status')}: <Text style={{ color: colors.safe }}>{cycloneSafe}</Text>
              </Text>
            )}
            {executionTime && (
              <Text style={styles.metaText}>
                {t('Telemetry latency', language, 'Telemetry latency')}: <Text style={{ color: colors.textHeading }}>{executionTime}</Text>
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceElevated,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs + 2,
  },
  headerText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  toolCountBadge: {
    backgroundColor: colors.accentSubtle,
    borderColor: colors.borderCyan,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  toolCountText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: typography.weights.bold,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  fieldBlock: {
    gap: 2,
  },
  fieldLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  fieldVal: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  agentTagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  agentTag: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  agentTagText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontFamily: typography.monoFontFamily,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: 10,
    color: colors.textMuted,
  },
});

export default EvidenceCard;
