import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { STARTER_PROMPTS } from '../constants/starterPrompts';
import { useConversations } from '../hooks/useConversations';
import { formatRelativeTime } from '../utils/dateUtils';
import { getCoordinates, requestLiveLocation, subscribeLocation } from '../services/locationService';
import { getSettings } from '../storage/settingsStorage';
import { t, subscribeLanguage } from '../i18n';
import Header from '../components/Header';

export function HomeScreen({ navigation }) {
  const { conversations, refresh, createNewChat } = useConversations();
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState(null);
  const [language, setLanguage] = useState('en');

  // Load active language and live GPS coordinates
  useEffect(() => {
    getCoordinates().then(setCoords);
    const unsubLoc = subscribeLocation(setCoords);
    const unsubLang = subscribeLanguage((l) => setLanguage(l));
    requestLiveLocation().then(setCoords);
    return () => {
      unsubLoc();
      unsubLang();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      getSettings().then((s) => {
        if (s?.language) setLanguage(s.language);
      });
    }, [refresh])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), requestLiveLocation().then(setCoords)]);
    setRefreshing(false);
  }, [refresh]);

  const handleStartNewChat = async (promptQuery = '') => {
    const newChat = await createNewChat(promptQuery);
    navigation.navigate('Chat', {
      conversationId: newChat.id,
      initialQuery: promptQuery,
    });
  };

  const handleOpenConversation = (chat) => {
    navigation.navigate('Chat', {
      conversationId: chat.id,
    });
  };

  const recentChats = conversations.slice(0, 4);

  const locationText = coords
    ? `${coords.name ? t(coords.name, language, coords.name) : t('Coastal Sector', language, 'Coastal Sector')} · ${coords.latitude.toFixed(2)}°N, ${coords.longitude.toFixed(2)}°E`
    : `${t('Chennai Waters', language, 'Chennai Waters')} · 13.08°N, 80.27°E`;

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />

      {/* Web-Style Top Navigation Bar with Zero Status Bar Overlap */}
      <Header
        title="ORCA"
        subtitle={t('Oceanographic AI & Maritime Safety Platform', language, 'Oceanographic AI & Maritime Safety Platform')}
        languageCode={language}
        onSelectLanguage={(l) => setLanguage(l)}
        showLocationStrip={true}
        locationText={locationText}
        vesselText={t('Fishing Trawler', language, 'Fishing Trawler')}
        onOpenHistory={() => navigation.navigate('History')}
        onOpenSettings={() => navigation.navigate('Settings')}
      />

      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* ── Hero Greeting Card (Web White Card & Ocean Blue Parity) ── */}
          <View style={styles.heroCard}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <View style={styles.livePulse} />
                <Text style={styles.heroBadgeText}>
                  {t('LIVE OCEAN TELEMETRY', language, 'LIVE OCEAN TELEMETRY')}
                </Text>
              </View>
              <View style={styles.isroBadge}>
                <Text style={styles.isroBadgeText}>INCOIS · MOSDAC</Text>
              </View>
            </View>

            <Text style={styles.heroGreeting}>
              {t('Where do you plan to sail today?', language, 'Where do you plan to sail today?')}
            </Text>
            <Text style={styles.heroDescription}>
              {t(
                'Ask ORCA about Potential Fishing Zones, weather safety, dangerous depressions, or optimal navigation routes.',
                language,
                'Ask ORCA about Potential Fishing Zones, weather safety, dangerous depressions, or optimal navigation routes.'
              )}
            </Text>

            {/* Live GPS Coordinates Banner */}
            <View style={styles.heroLocationPill}>
              <Feather name="map-pin" size={13} color={colors.primary} />
              <Text style={styles.heroLocationText}>
                {t('Active Coordinates', language, 'Active Coordinates')}:{' '}
                <Text style={styles.heroLocationBold}>
                  {coords?.name ? t(coords.name, language, coords.name) : t('Chennai Waters', language, 'Chennai Waters')}
                </Text>{' '}
                ({coords ? `${coords.latitude.toFixed(4)}° N, ${coords.longitude.toFixed(4)}° E` : '13.0827° N, 80.2707° E'})
              </Text>
            </View>

            {/* New Consultation CTA Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => handleStartNewChat('')}
              style={styles.newChatButton}
            >
              <Feather name="message-circle" size={18} color={colors.white} />
              <Text style={styles.newChatButtonText}>
                {t('Start New Consultation', language, 'Start New Consultation')}
              </Text>
              <Feather name="arrow-right" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* ── Quick Maritime Advisories (Web Prompt Suggestions) ── */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Feather name="zap" size={14} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                {t('QUICK MARITIME ADVISORIES', language, 'QUICK MARITIME ADVISORIES')}
              </Text>
            </View>
            <Text style={styles.sectionBadge}>{t('AI AGENTIC', language, 'AI AGENTIC')}</Text>
          </View>

          <View style={styles.promptsGrid}>
            {STARTER_PROMPTS.map((prompt) => {
              const promptTitle = t(prompt.title, language, prompt.title);
              const promptSubtitle = t(prompt.subtitle, language, prompt.subtitle);
              return (
                <TouchableOpacity
                  key={prompt.id}
                  activeOpacity={0.75}
                  onPress={() => handleStartNewChat(prompt.query)}
                  style={styles.promptCard}
                >
                  <View style={styles.promptHeader}>
                    <View style={styles.promptIconBox}>
                      <Feather name={prompt.icon} size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.promptTitle}>{promptTitle}</Text>
                  </View>
                  <Text style={styles.promptSubtitle}>{promptSubtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Recent Conversations Section ── */}
          {recentChats.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Feather name="clock" size={14} color={colors.primary} />
                  <Text style={styles.sectionTitle}>
                    {t('RECENT CONSULTATIONS', language, 'RECENT CONSULTATIONS')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('History')}>
                  <Text style={styles.viewAllText}>{t('View All', language, 'View All')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recentList}>
                {recentChats.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    activeOpacity={0.7}
                    onPress={() => handleOpenConversation(chat)}
                    style={styles.recentItem}
                  >
                    <View style={styles.recentItemLeft}>
                      <View style={styles.recentChatIconBox}>
                        <Feather name="message-square" size={14} color={colors.primary} />
                      </View>
                      <View style={styles.recentTextCol}>
                        <Text style={styles.recentTitle} numberOfLines={1}>
                          {chat.title ? t(chat.title, language, chat.title) : t('Marine Consultation', language, 'Marine Consultation')}
                        </Text>
                        <Text style={styles.recentDate}>
                          {formatRelativeTime(chat.updatedAt || chat.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
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
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.xl,
    padding: spacing.base,
    margin: spacing.base,
    ...spacing.shadows.card,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 6,
    columnGap: 8,
    marginBottom: spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSubtle,
    borderColor: colors.borderCyan,
    borderWidth: 1,
    borderRadius: spacing.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    flexShrink: 1,
    maxWidth: '100%',
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.safe,
  },
  heroBadgeText: {
    fontSize: 9.5,
    fontWeight: typography.weights.black,
    color: colors.primary,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  isroBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: spacing.radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    alignSelf: 'center',
    flexShrink: 0,
  },
  isroBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  heroGreeting: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.textHeading,
    letterSpacing: 0.2,
    marginBottom: spacing.xs,
  },
  heroDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeights.base,
    marginBottom: spacing.md,
  },
  heroLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    marginBottom: spacing.md,
  },
  heroLocationText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  heroLocationBold: {
    color: colors.textHeading,
    fontWeight: typography.weights.bold,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: spacing.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
    ...spacing.shadows.subtle,
  },
  newChatButtonText: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.white,
    letterSpacing: 0.2,
    flexShrink: 1,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: typography.weights.black,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  sectionBadge: {
    fontSize: 9,
    fontWeight: typography.weights.black,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  promptsGrid: {
    paddingHorizontal: spacing.base,
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
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  promptIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderCyan,
  },
  promptTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textHeading,
  },
  promptSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginLeft: 38,
  },
  recentSection: {
    marginTop: spacing.lg,
  },
  viewAllText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  recentList: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...spacing.shadows.subtle,
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  recentChatIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTextCol: {
    flex: 1,
  },
  recentTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  recentDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});

export default HomeScreen;
