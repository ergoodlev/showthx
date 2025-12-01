/**
 * GlassTabBar Component
 * iOS-style glass tab bar for bottom navigation
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const GlassTabBar = ({
  children,
  intensity = 80,
  tint = 'light',
  style,
}) => {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const bottomPadding = Math.max(insets.bottom, 8);

  const containerStyle = [
    styles.container,
    {
      paddingBottom: bottomPadding,
    },
    style,
  ];

  if (isIOS) {
    return (
      <BlurView intensity={intensity} tint={tint} style={containerStyle}>
        <View style={styles.content}>{children}</View>
      </BlurView>
    );
  }

  // Android fallback
  return (
    <View
      style={[
        containerStyle,
        {
          backgroundColor:
            tint === 'dark'
              ? 'rgba(0, 0, 0, 0.9)'
              : 'rgba(255, 255, 255, 0.95)',
        },
      ]}
    >
      <View style={styles.content}>{children}</View>
    </View>
  );
};

/**
 * GlassHeaderBar Component
 * iOS-style glass header/navigation bar
 */
export const GlassHeaderBar = ({
  children,
  intensity = 80,
  tint = 'light',
  style,
}) => {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  const containerStyle = [
    styles.headerContainer,
    {
      paddingTop: insets.top,
    },
    style,
  ];

  if (isIOS) {
    return (
      <BlurView intensity={intensity} tint={tint} style={containerStyle}>
        <View style={styles.headerContent}>{children}</View>
      </BlurView>
    );
  }

  // Android fallback
  return (
    <View
      style={[
        containerStyle,
        {
          backgroundColor:
            tint === 'dark'
              ? 'rgba(0, 0, 0, 0.9)'
              : 'rgba(255, 255, 255, 0.95)',
        },
      ]}
    >
      <View style={styles.headerContent}>{children}</View>
    </View>
  );
};

/**
 * GlassOverlay Component
 * Full-screen glass overlay for modals, sheets
 */
export const GlassOverlay = ({
  children,
  intensity = 50,
  tint = 'dark',
  onPress,
  style,
}) => {
  const isIOS = Platform.OS === 'ios';

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { activeOpacity: 1, onPress } : {};

  return (
    <Wrapper style={[styles.overlay, style]} {...wrapperProps}>
      {isIOS ? (
        <BlurView
          intensity={intensity}
          tint={tint}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                tint === 'dark'
                  ? 'rgba(0, 0, 0, 0.7)'
                  : 'rgba(255, 255, 255, 0.7)',
            },
          ]}
        />
      )}
      {children}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default { GlassTabBar, GlassHeaderBar, GlassOverlay };
