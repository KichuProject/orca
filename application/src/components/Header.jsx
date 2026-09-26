import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { SUPPORTED_LANGUAGES } from '../constants/config';
import ORCAAvatar from './ORCAAvatar';
import { t, setAppLanguage, subscribeLanguage } from '../i18n';

export function Header({
  title = 'ORCA',
  subtitle = 'Oceanographic AI & Maritime Safety Platform',
  languageCode,
  onSelectLanguage,
  showLocationStrip = false,
  locationText = 'Live Marine Sector',
  vesselText = 'Fishing Trawler',
  onBack,
  onNewChat,
  onOpenHistory,
  onOpenSettings,
  style,
}) {
  const insets = useSafeAreaInsets();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState(languageCode || 'en');

  // Calculate safe top padding ensuring zero collision with camera cutout / status bar
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  ) + 6;

  // Reactively track language changes across app
  useEffect(() => {
    if (languageCode) {
      setCurrentLang(languageCode);
    }
    const unsub = subscribeLanguage((l) => {
      setCurrentLang(l);
    });
    return () => unsub();
  }, [languageCode]);

  const handleLanguageSelect = async (code) => {
    setCurrentLang(code);
    setLangModalVisible(false);
    await setAppLanguage(code);
    if (onSelectLanguage) {
      onSelectLanguage(code);
    }
  };

  const activeLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  const translatedTitle = t(title, currentLang, title);
  const translatedSubtitle = t(subtitle, currentLang, subtitle);
  const translatedVessel = t(vesselText, currentLang, vesselText);

  return (
    <View style={[styles.rootContainer, { paddingTop: topPadding }, style]}>
      {/* ── Main Top Bar ───────────────────────────────────────── */}
      <View style={styles.topBarRow}>
        {/* Left: Back Button OR 3D Marine Mascot Logo */}
        <View style={styles.leftSection}>
          {onBack ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onBack}
              style={styles.circleIconButton}
              accessibilityLabel="Go back"
            >
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.brandBadgeWrapper}>
              <ORCAAvatar size={36} showAura={true} />
              <View style={styles.liveDotBadge} />
            </View>
          )}

          {/* Brand Text / Title */}
          <View style={styles.brandTitleCol}>
            <View style={styles.titleRow}>
              <Text style={styles.brandName} numberOfLines={1}>
                {translatedTitle}
              </Text>
              {!onBack && (
                <View style={styles.livePill}>
                  <View style={styles.livePillDot} />
                  <Text style={styles.livePillText}>{t('LIVE', currentLang, 'LIVE')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.brandSubtitle} numberOfLines={1}>
              {translatedSubtitle}
            </Text>
          </View>
        </View>

        {/* Right: Quick Actions (Language, New Chat, History, Settings) */}
        <View style={styles.rightSection}>
          {/* Quick Language Selector Pill */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setLangModalVisible(true)}
            style={styles.langPillButton}
            accessibilityLabel="Switch language"
          >
            <Feather name="globe" size={13} color={colors.primary} />
            <Text style={styles.langPillText}>{activeLangObj.code.toUpperCase()}</Text>
          </TouchableOpacity>

          {/* New Chat Button */}
          {onNewChat && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onNewChat}
              style={styles.circleIconButton}
              accessibilityLabel="Start new consultation"
            >
              <Feather name="edit" size={17} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* Conversation History */}
          {onOpenHistory && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenHistory}
              style={styles.circleIconButton}
              accessibilityLabel="Open conversation history"
            >
              <Feather name="clock" size={17} color={colors.text} />
            </TouchableOpacity>
          )}

          {/* Settings */}
          {onOpenSettings && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenSettings}
              style={styles.circleIconButton}
              accessibilityLabel="Open application settings"
            >
              <Feather name="settings" size={17} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Optional Location & Vessel Telemetry Strip (Web UI Parity) ── */}
      {showLocationStrip && (
        <View style={styles.telemetryStrip}>
          <View style={styles.telemetryItem}>
            <Feather name="map-pin" size={12} color={colors.primary} />
            <Text style={styles.telemetryText} numberOfLines={1}>
              {locationText}
            </Text>
          </View>
          <View style={styles.telemetryDivider} />
          <View style={styles.telemetryItemRight}>
            <Feather name="anchor" size={12} color={colors.primaryDark} />
            <Text style={styles.telemetryText} numberOfLines={1}>
              {translatedVessel}
            </Text>
          </View>
        </View>
      )}

      {/* ── Multilingual Selection Modal ───────────────────────── */}
      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setLangModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Feather name="globe" size={18} color={colors.primary} />
                <Text style={styles.modalTitle}>
                  {t('Coastal Language', currentLang, 'Coastal Language')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setLangModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item.code === currentLang;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleLanguageSelect(item.code)}
                    style={[
                      styles.langOptionItem,
                      isSelected && styles.langOptionSelected,
                    ]}
                  >
                    <View style={styles.langOptionTextCol}>
                      <Text
                        style={[
                          styles.langOptionNative,
                          isSelected && styles.langOptionTextActive,
                        ]}
                      >
                        {item.native}
                      </Text>
                      <Text style={styles.langOptionName}>({item.name})</Text>
                    </View>
                    {isSelected && (
                      <Feather name="check" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    ...spacing.shadows.card,
    zIndex: 50,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.xs,
  },
  brandBadgeWrapper: {
    position: 'relative',
  },
  liveDotBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.safe,
    borderWidth: 1.5,
    borderColor: colors.surfaceElevated,
  },
  brandTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.black,
    color: colors.textHeading,
    letterSpacing: 0.8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.safeBg,
    borderColor: colors.safeBorder,
    borderWidth: 1,
    borderRadius: spacing.radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  livePillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.safe,
  },
  livePillText: {
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    color: colors.safe,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  langPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSubtle,
    borderColor: colors.borderCyan,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  circleIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: spacing.xs + 2,
  },
  telemetryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  telemetryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  telemetryDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  telemetryText: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '75%',
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.xl,
    padding: spacing.base,
    ...spacing.shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.xs,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textHeading,
  },
  modalCloseBtn: {
    padding: 4,
  },
  langOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: spacing.radius.md,
    marginVertical: 2,
  },
  langOptionSelected: {
    backgroundColor: colors.accentSubtle,
    borderColor: colors.borderActive,
    borderWidth: 1,
  },
  langOptionTextCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langOptionNative: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.bold,
  },
  langOptionName: {
    fontSize: 11,
    color: colors.textMuted,
  },
  langOptionTextActive: {
    color: colors.primary,
  },
});

export default Header;
