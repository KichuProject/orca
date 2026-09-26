import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import ORCAAvatar from './ORCAAvatar';
import { t } from '../i18n';

// Intent preview mapping matching Web frontend AgentLiveLoading.jsx
const INTENT_PREVIEWS = {
  navigation: {
    badge: 'Passage Routing Swarm',
    icon: 'compass',
    color: colors.primary,
  },
  pfz: {
    badge: 'Fisheries & Chlorophyll Swarm',
    icon: 'target',
    color: '#059669',
  },
  hazard: {
    badge: 'Severe Hazard Alert Swarm',
    icon: 'alert-triangle',
    color: '#dc2626',
  },
  safety: {
    badge: 'Vessel Safety Multi-Agent Swarm',
    icon: 'shield',
    color: '#0284c7',
  },
};

const AGENT_STAGES = [
  {
    id: 'planner_agent',
    name: 'Intent Planner',
    action: 'Analyzing query & dispatching parallel agents...',
    summary: 'Classified',
    pct: 22,
  },
  {
    id: 'ocean_agent',
    name: 'Ocean State Agent',
    action: 'Querying INCOIS & MOSDAC satellite telemetry...',
    summary: 'SST & Currents',
    pct: 46,
  },
  {
    id: 'weather_agent',
    name: 'Weather Agent',
    action: 'Verifying IMD synoptic warnings & wave forecasts...',
    summary: 'Waves Normal',
    pct: 70,
  },
  {
    id: 'safety_agent',
    name: 'Safety Rule Guard',
    action: 'Checking EEZ boundaries & Marine Sanctuaries...',
    summary: 'EEZ Compliant',
    pct: 88,
  },
  {
    id: 'fusion_agent',
    name: 'Telemetry Fusion',
    action: 'Fusing multi-agent reasoning & marine verdict...',
    summary: 'Synthesizing',
    pct: 96,
  },
];

export function AgentLiveLoading({
  queryText = '',
  statusText = '',
  language = 'en',
  onCancel,
  style,
  plannedAgents = [],
  activeAction = '',
  progressPct = 0,
}) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const progressAnim = useRef(new Animated.Value(15)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0.5)).current;

  // Determine intent category from queryText matching web
  const intentConfig = useMemo(() => {
    const q = (queryText || '').toLowerCase();
    if (q.includes('route') || q.includes('navigate') || q.includes('sail') || q.includes('path')) {
      return INTENT_PREVIEWS.navigation;
    }
    if (q.includes('pfz') || q.includes('fish') || q.includes('catch') || q.includes('tuna') || q.includes('mackerel')) {
      return INTENT_PREVIEWS.pfz;
    }
    if (q.includes('cyclone') || q.includes('storm') || q.includes('wave') || q.includes('warning') || q.includes('depression')) {
      return INTENT_PREVIEWS.hazard;
    }
    return INTENT_PREVIEWS.safety;
  }, [queryText]);

  // Pulse beacon animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Top Shimmer Accent line pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  // Normalise agents from plannedAgents or fallback simulated AGENT_STAGES
  const normalizedAgents = useMemo(() => {
    if (Array.isArray(plannedAgents) && plannedAgents.length > 0) {
      return plannedAgents.map((ag, idx) => {
        if (typeof ag === 'string') {
          return {
            id: ag,
            tool: ag,
            name: ag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            status: idx === 0 ? 'running' : 'planned',
            summary: '',
          };
        }
        return {
          id: ag.id || ag.tool || ag.name || `agent_${idx}`,
          tool: ag.tool || ag.name || 'agent',
          name: ag.name || (ag.tool || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          status: ag.status || (idx === 0 ? 'running' : 'planned'),
          summary: ag.summary || '',
        };
      });
    }
    return AGENT_STAGES.map((ag, idx) => ({
      ...ag,
      status: idx < currentStageIdx ? 'completed' : idx === currentStageIdx ? 'running' : 'planned',
    }));
  }, [plannedAgents, currentStageIdx]);

  // Handle progress animation (either from progressPct prop or timer)
  useEffect(() => {
    if (progressPct > 0) {
      Animated.timing(progressAnim, {
        toValue: Math.min(98, Math.max(10, progressPct)),
        duration: 400,
        useNativeDriver: false,
      }).start();
      return;
    }

    let stage = 0;
    const interval = setInterval(() => {
      stage += 1;
      if (stage < AGENT_STAGES.length) {
        setCurrentStageIdx(stage);
        Animated.timing(progressAnim, {
          toValue: AGENT_STAGES[stage].pct,
          duration: 600,
          useNativeDriver: false,
        }).start();
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [progressPct, progressAnim]);

  // Stats computation matching web
  const completedCount = normalizedAgents.filter((a) => a.status === 'completed').length;
  const runningCount = normalizedAgents.filter((a) => a.status === 'running').length;
  const totalCount = normalizedAgents.length;

  const currentPct = useMemo(() => {
    if (progressPct > 0) return Math.min(98, Math.max(10, Math.round(progressPct)));
    if (totalCount === 0) return 15;
    const activeStage = AGENT_STAGES[currentStageIdx] || AGENT_STAGES[0];
    return Math.round(activeStage.pct);
  }, [progressPct, currentStageIdx, totalCount]);

  // Current active display text matching web
  const displayAction = useMemo(() => {
    if (activeAction) return activeAction;
    if (statusText) return statusText;
    const running = normalizedAgents.find((a) => a.status === 'running');
    if (running) {
      const runningName = t(running.name, language, running.name);
      return `${t('Executing', language, 'Executing')} ${runningName}...`;
    }
    if (completedCount > 0 && completedCount === totalCount) {
      return t('Fusing multi-agent reasoning & marine verdict...', language, 'Fusing multi-agent reasoning & marine verdict...');
    }
    return t('Analyzing query & dispatching parallel agents...', language, 'Analyzing query & dispatching parallel agents...');
  }, [activeAction, statusText, normalizedAgents, completedCount, totalCount, language]);

  return (
    <View style={[styles.container, style]}>
      {/* Top Gradient Shimmer Accent Bar */}
      <Animated.View
        style={[
          styles.shimmerAccentBar,
          { opacity: shimmerAnim },
        ]}
      />

      {/* ── HEADER ROW (Avatar + Swarm Badge + Progress Metrics) ── */}
      <View style={styles.headerRow}>
        {/* ORCA Avatar with Animated Beacon Dot */}
        <View style={styles.avatarContainer}>
          <ORCAAvatar size={34} showAura={false} />
          <Animated.View
            style={[
              styles.beaconPulse,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
        </View>

        {/* Center Swarm Tag & Real-time Progress */}
        <View style={styles.headerCenterCol}>
          <View style={styles.badgeLine}>
            <View style={styles.swarmPill}>
              <View style={[styles.liveDot, { backgroundColor: intentConfig.color }]} />
              <Text style={styles.swarmPillText} numberOfLines={1}>
                {t('Agent Activity Stream', language, 'Agent Activity Stream')} · {t(intentConfig.badge, language, intentConfig.badge)}
              </Text>
            </View>

            <View style={styles.metricsGroup}>
              <Text style={styles.agentCounterText}>
                {completedCount}/{totalCount} {t('Agents', language, 'Agents')}
              </Text>
              <Text style={styles.pctText}>{currentPct}%</Text>
            </View>
          </View>

          {/* Active Action Label with Activity Indicator */}
          <View style={styles.actionRow}>
            <ActivityIndicator size="small" color={colors.primary} style={styles.actionSpinner} />
            <Text style={styles.actionText} numberOfLines={1}>
              {displayAction}
            </Text>
          </View>

          {/* Glowing Animated Progress Bar */}
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* ── CONCURRENT LIVE SWARM TELEMETRY CHIPS ── */}
      <View style={styles.telemetrySection}>
        <View style={styles.telemetryHeaderRow}>
          <View style={styles.telemetryTitleBox}>
            <Feather name="activity" size={11} color="#059669" />
            <Text style={styles.telemetryTitle}>
              {t('LIVE SWARM TELEMETRY', language, 'LIVE SWARM TELEMETRY')}
            </Text>
          </View>
          <View style={styles.sseBadge}>
            <Text style={styles.sseBadgeText}>● LIVE SSE</Text>
          </View>
        </View>

        {/* Agent Activity Chips */}
        <View style={styles.chipsContainer}>
          {normalizedAgents.map((ag, idx) => {
            const isCompleted = ag.status === 'completed';
            const isRunning = ag.status === 'running';

            return (
              <View
                key={ag.id || ag.tool || idx}
                style={[
                  styles.chip,
                  isCompleted && styles.chipCompleted,
                  isRunning && styles.chipRunning,
                ]}
              >
                {isCompleted ? (
                  <Feather name="check-circle" size={11} color="#059669" />
                ) : isRunning ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.75 }] }} />
                ) : (
                  <View style={styles.plannedDot} />
                )}

                <Text
                  style={[
                    styles.chipName,
                    isCompleted && styles.chipNameCompleted,
                    isRunning && styles.chipNameRunning,
                  ]}
                  numberOfLines={1}
                >
                  {t(ag.name, language, ag.name)}
                </Text>

                {isCompleted && ag.summary ? (
                  <View style={styles.chipSummaryPill}>
                    <Text style={styles.chipSummaryText}>{ag.summary}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      {/* Optional Cancel Button */}
      {onCancel && (
        <View style={styles.cancelRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onCancel}
            style={styles.cancelButton}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Feather name="x" size={11} color={colors.textMuted} />
            <Text style={styles.cancelText}>{t('Cancel', language, 'Cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.base,
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderCyan,
    borderWidth: 1,
    borderRadius: spacing.radius.xl,
    padding: spacing.md,
    overflow: 'hidden',
    ...spacing.shadows.card,
  },
  shimmerAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    marginTop: 2,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beaconPulse: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e5ff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  headerCenterCol: {
    flex: 1,
    gap: 4,
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  swarmPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentSubtle,
    borderColor: colors.borderCyan,
    borderWidth: 1,
    borderRadius: spacing.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  swarmPillText: {
    fontSize: 9.5,
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  metricsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  agentCounterText: {
    fontSize: 10,
    fontFamily: typography.monoFontFamily,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  pctText: {
    fontSize: 11,
    fontFamily: typography.monoFontFamily,
    fontWeight: typography.weights.black,
    color: colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  actionSpinner: {
    marginRight: 2,
    transform: [{ scale: 0.7 }],
  },
  actionText: {
    fontSize: typography.sizes.xs + 0.5,
    fontWeight: typography.weights.bold,
    color: colors.textHeading,
    flex: 1,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.borderSubtle,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  telemetrySection: {
    marginTop: spacing.sm + 2,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  telemetryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  telemetryTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telemetryTitle: {
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  sseBadge: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: spacing.radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  sseBadgeText: {
    fontSize: 8.5,
    fontWeight: typography.weights.bold,
    color: '#059669',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: spacing.radius.sm + 2,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  chipCompleted: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  chipRunning: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.primaryLight,
    borderWidth: 1.2,
  },
  plannedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.border,
  },
  chipName: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
    color: colors.textDim,
  },
  chipNameCompleted: {
    fontWeight: typography.weights.bold,
    color: '#065f46',
  },
  chipNameRunning: {
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  chipSummaryPill: {
    backgroundColor: '#d1fae5',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginLeft: 2,
  },
  chipSummaryText: {
    fontSize: 8,
    fontFamily: typography.monoFontFamily,
    color: '#047857',
  },
  cancelRow: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cancelText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
  },
});

export default AgentLiveLoading;
