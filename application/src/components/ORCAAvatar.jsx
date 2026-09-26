import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

let MASCOT_IMAGE_SOURCE;
try {
  MASCOT_IMAGE_SOURCE = require('../../assets/orca-mascot-3d.png');
} catch {
  MASCOT_IMAGE_SOURCE = null;
}

export function ORCAAvatar({ size = 36, isAnimated = false, showAura = true, style }) {
  const [imageFailed, setImageFailed] = useState(false);
  const innerSize = Math.round(size * 0.76);

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      {showAura && (
        <View
          style={[
            styles.aura,
            {
              width: size + 8,
              height: size + 8,
              borderRadius: Math.round((size + 8) * 0.38),
            },
          ]}
        />
      )}
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.35),
          },
        ]}
      >
        {MASCOT_IMAGE_SOURCE && !imageFailed ? (
          <Image
            source={MASCOT_IMAGE_SOURCE}
            style={{ width: innerSize, height: innerSize }}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <MaterialCommunityIcons
            name="sail-boat"
            size={Math.round(size * 0.55)}
            color={colors.accent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    backgroundColor: colors.accentGlow,
    opacity: 0.6,
  },
  container: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.borderCyan,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default ORCAAvatar;
