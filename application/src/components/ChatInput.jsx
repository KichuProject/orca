import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import VoiceButton from './VoiceButton';
import { getCoordinates, requestLiveLocation, subscribeLocation } from '../services/locationService';
import { t } from '../i18n';

export function ChatInput({
  onSend,
  disabled = false,
  isRecording = false,
  isTranscribing = false,
  durationSec = 0,
  recordingDuration = 0,
  onStartVoice,
  onStartRecording,
  onStopVoice,
  onStopRecording,
  onCancelVoice,
  onCancelRecording,
  language = 'en',
  placeholder,
}) {
  const activeDuration = durationSec || recordingDuration;
  const handleStartVoice = onStartVoice || onStartRecording;
  const handleStopVoice = onStopVoice || onStopRecording;
  const handleCancelVoice = onCancelVoice || onCancelRecording;

  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(44);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Subscribe to live location updates
  useEffect(() => {
    getCoordinates().then(setCurrentCoords);
    const unsubscribe = subscribeLocation((coords) => {
      setCurrentCoords(coords);
    });
    // Query real GPS location on mount
    requestLiveLocation().then(setCurrentCoords);
    return () => unsubscribe();
  }, []);

  const handleRefreshLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const loc = await requestLiveLocation();
      setCurrentCoords(loc);
    } finally {
      setIsLocating(false);
    }
  }, []);

  const canSend = text.trim().length > 0 && !disabled && !isRecording && !isTranscribing;

  const handleSend = () => {
    if (!canSend) return;
    const content = text.trim();
    setText('');
    setInputHeight(44);

    // Pass live location coordinates with the chat submission
    onSend(content, {
      lat: currentCoords?.latitude,
      lon: currentCoords?.longitude,
      locationName: currentCoords?.name,
    });
  };

  const defaultPlaceholder = t(
    'Ask ORCA about fishing zones, waves, routes...',
    language,
    'Ask ORCA about fishing zones, waves, routes...'
  );

  return (
    <View style={styles.container}>
      {/* ── Live GPS Location Coordinates Pill Above Input ── */}
      <View style={styles.locationBarRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleRefreshLocation}
          style={styles.locationPill}
          accessibilityLabel="Refresh live GPS location"
        >
          <View style={styles.locationPulseDot} />
          <Feather name="map-pin" size={11} color={colors.primary} />
          <Text style={styles.locationPillText} numberOfLines={1}>
            {currentCoords
              ? `${currentCoords.name ? t(currentCoords.name, language, currentCoords.name) : 'GPS'}: ${currentCoords.latitude.toFixed(2)}°N, ${currentCoords.longitude.toFixed(2)}°E`
              : t('Acquiring Marine GPS...', language, 'Acquiring Marine GPS...')}
          </Text>
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />
          ) : (
            <Feather name="refresh-cw" size={10} color={colors.textMuted} style={{ marginLeft: 3 }} />
          )}
        </TouchableOpacity>

        <View style={styles.gpsStatusBadge}>
          <Text style={styles.gpsStatusText}>
            {currentCoords?.isLiveGps ? `● ${t('LIVE GPS', language, 'LIVE GPS')}` : `● ${t('COASTAL SECTOR', language, 'COASTAL SECTOR')}`}
          </Text>
        </View>
      </View>

      {/* ── Live Voice Recording Status Bar ── */}
      {isRecording && (
        <View style={styles.recordingBanner}>
          <View style={styles.recordingStatusLeft}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingDurationText}>
              {t('Recording', language, 'Recording')} {activeDuration}s
            </Text>
          </View>
          <Text style={styles.recordingHintText}>
            {t('Speak clearly into phone mic', language, 'Speak clearly into phone mic')}
          </Text>
          <TouchableOpacity
            onPress={handleCancelVoice}
            style={styles.cancelRecordBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={16} color={colors.textSecondary} />
            <Text style={styles.cancelRecordText}>{t('Cancel', language, 'Cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Transcribing Banner ── */}
      {isTranscribing && (
        <View style={styles.transcribingBanner}>
          <Feather name="loader" size={14} color={colors.primary} />
          <Text style={styles.transcribingText}>
            {t('Transcribing with Faster-Whisper...', language, 'Transcribing with Faster-Whisper...')}
          </Text>
        </View>
      )}

      {/* ── Main Input Row ── */}
      <View style={styles.inputRow}>
        {/* Voice Button */}
        <VoiceButton
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          onPress={isRecording ? handleStopVoice : handleStartVoice}
          disabled={disabled}
        />

        {/* Text Input Box */}
        <View style={[styles.inputBox, { height: Math.min(120, Math.max(44, inputHeight)) }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={isRecording ? 'Listening...' : placeholder || defaultPlaceholder}
            placeholderTextColor={colors.textDim}
            multiline
            editable={!disabled && !isRecording && !isTranscribing}
            onContentSizeChange={(e) => {
              setInputHeight(e.nativeEvent.contentSize.height + 12);
            }}
            style={styles.textInput}
            keyboardAppearance="light"
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          accessibilityLabel="Send marine question"
        >
          <Feather
            name="arrow-up"
            size={20}
            color={canSend ? colors.white : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.sm,
    ...spacing.shadows.subtle,
  },
  locationBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
    paddingHorizontal: 2,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentSubtle,
    borderColor: colors.borderCyan,
    borderWidth: 1,
    borderRadius: spacing.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    maxWidth: '78%',
  },
  locationPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.safe,
  },
  locationPillText: {
    fontSize: 10.5,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  gpsStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: spacing.radius.sm,
    backgroundColor: colors.surface,
  },
  gpsStatusText: {
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  recordingStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  recordingDurationText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.danger,
  },
  recordingHintText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cancelRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cancelRecordText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  transcribingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSubtle,
    borderColor: colors.borderCyan,
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  transcribingText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  inputBox: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.xl,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  textInput: {
    color: colors.text,
    fontSize: typography.sizes.base,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 110,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderWidth: 1,
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...spacing.shadows.subtle,
  },
});

export default ChatInput;
