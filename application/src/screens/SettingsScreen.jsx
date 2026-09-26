import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import {
  SUPPORTED_LANGUAGES,
  STORAGE_TIERS,
} from '../constants/config';
import { getSettings, saveSettings } from '../storage/settingsStorage';
import { getStorageUsage, clearAllConversations } from '../storage/chatStorage';
import { getBaseUrl, setBaseUrl } from '../config/api';
import { checkBackendHealth } from '../api/chatApi';
import Header from '../components/Header';
import { t, setAppLanguage, subscribeLanguage } from '../i18n';

export function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(null);
  const [currentLang, setCurrentLang] = useState('en');
  const [storageUsage, setStorageUsage] = useState({ formatted: '0 KB', conversationCount: 0, messageCount: 0 });
  const [customUrl, setCustomUrl] = useState('');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiHealthStatus, setApiHealthStatus] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const s = await getSettings();
      setSettings(s);
      if (s?.language) setCurrentLang(s.language);
      setCustomUrl(s.customApiUrl || getBaseUrl());

      const usage = await getStorageUsage(s.userId);
      setStorageUsage(usage);
    } catch (err) {
      console.error('Settings load error:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsub = subscribeLanguage((l) => setCurrentLang(l));
    return () => unsub();
  }, [loadData]);

  const handleSelectLanguage = async (langCode) => {
    await setAppLanguage(langCode);
    const updated = await saveSettings({ language: langCode });
    setSettings(updated);
    setCurrentLang(langCode);
  };

  const handleSelectStorageTier = async (tierId) => {
    const updated = await saveSettings({ storageTier: tierId });
    setSettings(updated);
  };

  const handleSaveApiUrl = async () => {
    if (!customUrl || !customUrl.trim()) return;
    const clean = customUrl.trim();
    setBaseUrl(clean);
    const updated = await saveSettings({ customApiUrl: clean });
    setSettings(updated);
    Alert.alert(
      t('Saved', currentLang, 'Saved'),
      t('Backend server URL updated successfully.', currentLang, 'Backend server URL updated successfully.')
    );
  };

  const handleTestConnection = async () => {
    setIsTestingApi(true);
    setApiHealthStatus(null);
    try {
      const result = await checkBackendHealth();
      setApiHealthStatus(result);
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleClearAllChats = () => {
    Alert.alert(
      t('Clear All Local Chats', currentLang, 'Clear All Local Chats'),
      t(
        'This will erase all conversation history and free up local storage. This action cannot be reversed.',
        currentLang,
        'This will erase all conversation history and free up local storage. This action cannot be reversed.'
      ),
      [
        { text: t('Cancel', currentLang, 'Cancel'), style: 'cancel' },
        {
          text: t('Clear All Data', currentLang, 'Clear All Data'),
          style: 'destructive',
          onPress: async () => {
            await clearAllConversations(settings?.userId);
            await loadData();
            Alert.alert(
              t('Success', currentLang, 'Success'),
              t('Local chat history cleared.', currentLang, 'Local chat history cleared.')
            );
          },
        },
      ]
    );
  };

  if (!settings) {
    return (
      <View style={styles.rootContainer}>
        <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
        <Header title={t('Maritime Settings', currentLang)} onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
      <Header
        title={t('Maritime Settings', currentLang)}
        subtitle={t('Selected Language', currentLang)}
        languageCode={currentLang}
        onSelectLanguage={handleSelectLanguage}
        onBack={() => navigation.goBack()}
      />

      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Coastal Language */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="globe" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('Selected Language', currentLang)}</Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t(
              'Select your primary maritime dialect. ORCA will reason and respond in this language.',
              currentLang,
              'Select your primary maritime dialect. ORCA will reason and respond in this language.'
            )}
          </Text>
          <View style={styles.languagesGrid}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const selected = settings.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  activeOpacity={0.7}
                  onPress={() => handleSelectLanguage(lang.code)}
                  style={[styles.languagePill, selected && styles.languagePillSelected]}
                >
                  <Text style={[styles.langNative, selected && styles.langNativeSelected]}>
                    {lang.native}
                  </Text>
                  <Text style={[styles.langName, selected && styles.langNameSelected]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: User-Specific Local Storage Policies */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="database" size={16} color={colors.accent} />
            <Text style={styles.sectionTitle}>{t('USER-SPECIFIC STORAGE QUOTA', currentLang, 'USER-SPECIFIC STORAGE QUOTA')}</Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t(
              'Configure the maximum amount of locally stored chat content for your profile.',
              currentLang,
              'Configure the maximum amount of locally stored chat content for your profile.'
            )}
          </Text>

          {/* Usage Stat Card */}
          <View style={styles.storageUsageCard}>
            <View style={styles.storageStatCol}>
              <Text style={styles.storageStatVal}>{storageUsage.formatted}</Text>
              <Text style={styles.storageStatLabel}>{t('Storage Used', currentLang, 'Storage Used')}</Text>
            </View>
            <View style={styles.storageStatDivider} />
            <View style={styles.storageStatCol}>
              <Text style={styles.storageStatVal}>{storageUsage.conversationCount}</Text>
              <Text style={styles.storageStatLabel}>{t('Consultations', currentLang, 'Consultations')}</Text>
            </View>
            <View style={styles.storageStatDivider} />
            <View style={styles.storageStatCol}>
              <Text style={styles.storageStatVal}>{storageUsage.messageCount}</Text>
              <Text style={styles.storageStatLabel}>{t('Messages', currentLang, 'Messages')}</Text>
            </View>
          </View>

          {/* Storage Tiers Radio List */}
          <View style={styles.tierList}>
            {Object.values(STORAGE_TIERS).map((tier) => {
              const selected = (settings.storageTier || 'standard') === tier.id;
              return (
                <TouchableOpacity
                  key={tier.id}
                  activeOpacity={0.7}
                  onPress={() => handleSelectStorageTier(tier.id)}
                  style={[styles.tierItem, selected && styles.tierItemSelected]}
                >
                  <View style={styles.tierRadio}>
                    {selected && <View style={styles.tierRadioInner} />}
                  </View>
                  <View style={styles.tierTextCol}>
                    <Text style={[styles.tierTitle, selected && styles.tierTitleSelected]}>
                      {t(tier.label, currentLang, tier.label)}
                    </Text>
                    <Text style={styles.tierDesc}>{t(tier.description, currentLang, tier.description)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={handleClearAllChats}
            style={styles.clearChatsBtn}
            accessibilityLabel="Clear all stored consultations"
          >
            <Feather name="trash-2" size={14} color={colors.danger} />
            <Text style={styles.clearChatsText}>{t('Clear All Local Chats', currentLang, 'Clear All Local Chats')}</Text>
          </TouchableOpacity>
        </View>

        {/* Section 3: Centralized Backend API Connection */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="server" size={16} color={colors.accent} />
            <Text style={styles.sectionTitle}>{t('FASTAPI BACKEND GATEWAY', currentLang, 'FASTAPI BACKEND GATEWAY')}</Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t(
              'Points the mobile client to your active FastAPI ORCA intelligence server.',
              currentLang,
              'Points the mobile client to your active FastAPI ORCA intelligence server.'
            )}
          </Text>

          <View style={styles.apiInputRow}>
            <TextInput
              value={customUrl}
              onChangeText={setCustomUrl}
              placeholder="e.g. http://10.0.2.2:8000"
              placeholderTextColor={colors.textDim}
              style={styles.apiInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardAppearance="dark"
            />
            <TouchableOpacity onPress={handleSaveApiUrl} style={styles.apiSaveBtn}>
              <Text style={styles.apiSaveText}>{t('Apply', currentLang, 'Apply')}</Text>
            </TouchableOpacity>
          </View>

          {/* Test Connection Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleTestConnection}
            disabled={isTestingApi}
            style={styles.testBtn}
          >
            {isTestingApi ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Feather name="activity" size={14} color={colors.accent} />
                <Text style={styles.testBtnText}>{t('Ping Server Health', currentLang, 'Ping Server Health')}</Text>
              </>
            )}
          </TouchableOpacity>

          {apiHealthStatus && (
            <View
              style={[
                styles.healthBanner,
                apiHealthStatus.online ? styles.healthBannerOnline : styles.healthBannerOffline,
              ]}
            >
              <Feather
                name={apiHealthStatus.online ? 'check-circle' : 'alert-circle'}
                size={14}
                color={apiHealthStatus.online ? colors.safe : colors.danger}
              />
              <Text
                style={[
                  styles.healthText,
                  { color: apiHealthStatus.online ? colors.safe : colors.danger },
                ]}
              >
                {apiHealthStatus.online
                  ? `${t('Connected', currentLang, 'Connected')} (${apiHealthStatus.latencyMs}ms)`
                  : t('Backend Unreachable', currentLang, 'Backend Unreachable')}
              </Text>
            </View>
          )}
        </View>

        {/* Section 4: About ORCA */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="shield" size={16} color={colors.accent} />
            <Text style={styles.sectionTitle}>{t('ABOUT ORCA MARINE', currentLang, 'ABOUT ORCA MARINE')}</Text>
          </View>
          <Text style={styles.aboutText}>
            {t(
              'ORCA is an autonomous Multi-Agent Intelligence System unifying ocean telemetry, INCOIS PFZ forecasts, IMD weather warnings, ISRO bathymetry, and naval routing logic for Indian coastal fishers.',
              currentLang,
              'ORCA is an autonomous Multi-Agent Intelligence System unifying ocean telemetry, INCOIS PFZ forecasts, IMD weather warnings, ISRO bathymetry, and naval routing logic for Indian coastal fishers.'
            )}
          </Text>
          <View style={styles.aboutFooter}>
            <Text style={styles.aboutVersion}>{t('Mobile Version 1.0.0 (Production)', currentLang, 'Mobile Version 1.0.0 (Production)')}</Text>
            <Text style={styles.aboutBuild}>{t('SDK 57 · React Native JSX', currentLang, 'SDK 57 · React Native JSX')}</Text>
          </View>
        </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.base,
    paddingBottom: spacing.xxl,
  },
  sectionCard: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...spacing.shadows.subtle,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  sectionDescription: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  languagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  languagePill: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '47%',
    flex: 1,
  },
  languagePillSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSubtle,
  },
  langNative: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textHeading,
  },
  langNativeSelected: {
    color: colors.accent,
  },
  langName: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  langNameSelected: {
    color: colors.primaryLight,
  },
  storageUsageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.radius.md,
    padding: spacing.md,
    marginVertical: 4,
  },
  storageStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  storageStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderSubtle,
  },
  storageStatVal: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textHeading,
  },
  storageStatLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  tierList: {
    gap: spacing.xs,
    marginTop: 4,
  },
  tierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  tierItemSelected: {
    borderColor: colors.borderCyan,
    backgroundColor: colors.surfaceHighlight,
  },
  tierRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.accent,
  },
  tierTextCol: {
    flex: 1,
  },
  tierTitle: {
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.semibold,
    color: colors.textHeading,
  },
  tierTitleSelected: {
    color: colors.accent,
  },
  tierDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  clearChatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    marginTop: 4,
  },
  clearChatsText: {
    color: colors.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  apiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  apiInput: {
    flex: 1,
    backgroundColor: colors.surfaceInput,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    color: colors.text,
    fontSize: typography.sizes.sm,
  },
  apiSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  apiSaveText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderCyan,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingVertical: 8,
    marginTop: 4,
  },
  testBtnText: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  healthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: spacing.radius.sm,
    marginTop: 4,
  },
  healthBannerOnline: {
    backgroundColor: colors.safeBg,
  },
  healthBannerOffline: {
    backgroundColor: colors.dangerBg,
  },
  healthText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  aboutText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  aboutFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  aboutVersion: {
    fontSize: 10,
    color: colors.textMuted,
  },
  aboutBuild: {
    fontSize: 10,
    color: colors.textDim,
  },
});

export default SettingsScreen;
