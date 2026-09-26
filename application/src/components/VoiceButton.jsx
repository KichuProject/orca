import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export function VoiceButton({
  isRecording = false,
  isTranscribing = false,
  onPress,
  disabled = false,
  size = 44,
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation;
    if (isRecording) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isRecording, pulseAnim]);

  const innerSize = Math.round(size * 0.48);

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {isRecording && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: size + 14,
              height: size + 14,
              borderRadius: (size + 14) / 2,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={disabled || isTranscribing}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          isRecording && styles.buttonRecording,
          isTranscribing && styles.buttonTranscribing,
          disabled && styles.buttonDisabled,
        ]}
        accessibilityLabel={isRecording ? 'Stop recording voice' : 'Ask question with voice'}
      >
        <Feather
          name={isTranscribing ? 'loader' : isRecording ? 'square' : 'mic'}
          size={innerSize}
          color={isRecording ? colors.danger : colors.text}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: 'rgba(229, 57, 53, 0.25)',
  },
  button: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRecording: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.danger,
  },
  buttonTranscribing: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.accent,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});

export default VoiceButton;
