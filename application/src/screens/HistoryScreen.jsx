import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useConversations } from '../hooks/useConversations';
import { groupConversationsByDate } from '../utils/dateUtils';
import ConversationItem from '../components/ConversationItem';
import Header from '../components/Header';
import { t, subscribeLanguage, setAppLanguage } from '../i18n';

export function HistoryScreen({ navigation }) {
  const [currentLang, setCurrentLang] = useState('en');
  const {
    conversations,
    loading,
    searchQuery,
    setSearchQuery,
    refresh,
    renameChat,
    deleteChat,
    clearAllChats,
  } = useConversations();

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  useFocusEffect(
    useCallback(() => {
      refresh();
      const unsub = subscribeLanguage((l) => setCurrentLang(l));
      return () => unsub();
    }, [refresh])
  );

  const handleOpenConversation = (chat) => {
    navigation.navigate('Chat', {
      conversationId: chat.id,
    });
  };

  const handlePromptRename = (chat) => {
    setRenameTarget(chat);
    setNewTitle(chat.title || '');
  };

  const handleSaveRename = async () => {
    if (renameTarget && newTitle.trim()) {
      await renameChat(renameTarget.id, newTitle.trim());
      setRenameTarget(null);
    }
  };

  const handleDeleteConfirm = (chat) => {
    Alert.alert(
      t('Delete Consultation', currentLang, 'Delete Consultation'),
      `${t('Are you sure you want to delete this consultation? This action cannot be undone.', currentLang, 'Are you sure you want to delete this consultation? This action cannot be undone.')} ("${chat.title || t('Marine Consultation', currentLang, 'Marine Consultation')}")`,
      [
        { text: t('Cancel', currentLang, 'Cancel'), style: 'cancel' },
        {
          text: t('Delete', currentLang, 'Delete'),
          style: 'destructive',
          onPress: () => deleteChat(chat.id),
        },
      ]
    );
  };

  const handleClearAllConfirm = () => {
    Alert.alert(
      t('Clear All Consultations', currentLang, 'Clear All Consultations'),
      t(
        'This will permanently delete all stored local conversations for this profile. Continue?',
        currentLang,
        'This will permanently delete all stored local conversations for this profile. Continue?'
      ),
      [
        { text: t('Cancel', currentLang, 'Cancel'), style: 'cancel' },
        {
          text: t('Clear All', currentLang, 'Clear All'),
          style: 'destructive',
          onPress: () => clearAllChats(),
        },
      ]
    );
  };

  const groupedSections = groupConversationsByDate(conversations);

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />

      {/* Top Header with Safe Area Insets */}
      <Header
        title={t('Consultation History', currentLang)}
        subtitle={`${conversations.length} ${t('Stored Sessions', currentLang, 'Stored Sessions')}`}
        languageCode={currentLang}
        onSelectLanguage={(l) => setCurrentLang(l)}
        onBack={() => navigation.goBack()}
        onNewChat={() => navigation.navigate('Chat', { conversationId: null })}
      />

      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('Search past marine consultations...', currentLang)}
            placeholderTextColor={colors.textDim}
            style={styles.searchInput}
            clearButtonMode="while-editing"
            keyboardAppearance="light"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {conversations.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAllConfirm}
            style={styles.clearAllBtn}
            accessibilityLabel="Clear all consultations"
          >
            <Feather name="trash" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Grouped SectionList */}
      <SectionList
        sections={groupedSections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={handleOpenConversation}
            onRename={handlePromptRename}
            onDelete={handleDeleteConfirm}
            language={currentLang}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{t(title, currentLang, title)}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={42} color={colors.border} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? t('No past consultations found', currentLang) : t('No past consultations found', currentLang)}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t('Start asking ORCA about fishing zones, weather conditions, or marine safety.', currentLang)}
            </Text>
          </View>
        }
      />

      {/* Rename Conversation Modal */}
      <Modal
        visible={!!renameTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('Rename Consultation', currentLang, 'Rename Consultation')}</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder={t('Enter consultation title', currentLang, 'Enter consultation title')}
              placeholderTextColor={colors.textDim}
              style={styles.modalInput}
              autoFocus
              keyboardAppearance="dark"
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setRenameTarget(null)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>{t('Cancel', currentLang, 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveRename}
                style={styles.modalSaveBtn}
              >
                <Text style={styles.modalSaveText}>{t('Save', currentLang, 'Save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.lg,
    paddingHorizontal: spacing.md,
    height: 42,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sizes.sm,
  },
  clearAllBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderCyan,
    borderWidth: 1,
    borderRadius: spacing.radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...spacing.shadows.card,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textHeading,
  },
  modalInput: {
    backgroundColor: colors.surfaceInput,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.sizes.base,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radius.md,
  },
  modalSaveText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});

export default HistoryScreen;
