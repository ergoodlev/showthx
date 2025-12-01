/**
 * LoadingSpinner Component
 * Edition-aware loading indicator
 */

import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useEdition } from '../context/EditionContext';

export const LoadingSpinner = ({
  visible = true,
  message = 'Loading...',
  size = 'large',
  fullScreen = false,
  style,
}) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  if (!visible) return null;

  const containerStyle = fullScreen
    ? styles.fullScreenContainer
    : styles.container;

  return (
    <View
      style={[
        containerStyle,
        {
          backgroundColor: fullScreen
            ? 'rgba(0, 0, 0, 0.3)'
            : 'transparent',
        },
        style,
      ]}
    >
      <View
        style={[
          styles.spinnerContainer,
          fullScreen && {
            backgroundColor: theme.neutralColors.white,
            borderRadius: theme.borderRadius.large,
            padding: theme.spacing.lg,
          },
        ]}
      >
        <ActivityIndicator
          size={size}
          color={theme.brandColors.coral}
          style={styles.spinner}
        />
        {message && (
          <Text
            style={[
              styles.message,
              {
                fontSize: isKidsEdition ? 16 : 14,
                color: theme.neutralColors.dark,
                fontFamily: isKidsEdition
                  ? 'Nunito_SemiBold'
                  : 'Montserrat_SemiBold',
                marginTop: theme.spacing.md,
              },
            ]}
          >
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 0,
  },
  message: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default LoadingSpinner;
