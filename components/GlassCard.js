/**
 * GlassCard Component
 * iOS-style glassmorphism card with blur effect
 * Follows Apple's "glass" design language
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useEdition } from '../context/EditionContext';

export const GlassCard = ({
  children,
  intensity = 50,
  tint = 'light', // 'light', 'dark', 'default'
  style,
  contentStyle,
  borderRadius,
  noPadding = false,
}) => {
  const { theme, edition } = useEdition();
  const isKidsEdition = edition === 'kids';
  const defaultBorderRadius = isKidsEdition
    ? theme.borderRadius.large
    : theme.borderRadius.medium;
  const radius = borderRadius ?? defaultBorderRadius;

  // On Android, BlurView has limited support, so we use a semi-transparent background
  const isIOS = Platform.OS === 'ios';

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius: radius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {isIOS ? (
        <BlurView
          intensity={intensity}
          tint={tint}
          style={[
            styles.blur,
            {
              borderRadius: radius,
            },
          ]}
        >
          <View
            style={[
              styles.content,
              !noPadding && { padding: theme.spacing.md },
              {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              contentStyle,
            ]}
          >
            {children}
          </View>
        </BlurView>
      ) : (
        // Android fallback - semi-transparent background
        <View
          style={[
            styles.content,
            !noPadding && { padding: theme.spacing.md },
            {
              backgroundColor:
                tint === 'dark'
                  ? 'rgba(0, 0, 0, 0.7)'
                  : 'rgba(255, 255, 255, 0.85)',
              borderRadius: radius,
            },
            contentStyle,
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  blur: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});

export default GlassCard;
