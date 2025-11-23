/**
 * GlassButton Component
 * iOS-style glassmorphism button with blur effect
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';

export const GlassButton = ({
  title,
  onPress,
  icon,
  iconPosition = 'left',
  intensity = 50,
  tint = 'light',
  variant = 'primary', // 'primary', 'secondary', 'outline'
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const { theme, edition } = useEdition();
  const isKidsEdition = edition === 'kids';
  const isIOS = Platform.OS === 'ios';

  // Determine colors based on variant (ShowThx brand colors)
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'rgba(131, 96, 195, 0.95)', // ShowThx Purple #8360c3
          text: '#FFFFFF',
          border: 'transparent',
        };
      case 'secondary':
        return {
          background: 'rgba(46, 191, 145, 0.95)', // ShowThx Teal #2ebf91
          text: '#FFFFFF',
          border: 'transparent',
        };
      case 'outline':
        return {
          background: 'rgba(255, 255, 255, 0.2)',
          text: theme.neutralColors.dark,
          border: theme.neutralColors.mediumGray,
        };
      default:
        return {
          background: 'rgba(255, 255, 255, 0.3)',
          text: theme.neutralColors.dark,
          border: 'transparent',
        };
    }
  };

  const colors = getColors();
  const borderRadius = isKidsEdition
    ? theme.borderRadius.large
    : theme.borderRadius.medium;

  const renderContent = () => (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={colors.text}
          style={{ marginRight: title ? 8 : 0 }}
        />
      ) : (
        icon &&
        iconPosition === 'left' && (
          <Ionicons
            name={icon}
            size={isKidsEdition ? 22 : 20}
            color={colors.text}
            style={{ marginRight: title ? 8 : 0 }}
          />
        )
      )}
      {title && (
        <Text
          style={[
            styles.text,
            {
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: colors.text,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
      {icon && iconPosition === 'right' && !loading && (
        <Ionicons
          name={icon}
          size={isKidsEdition ? 22 : 20}
          color={colors.text}
          style={{ marginLeft: title ? 8 : 0 }}
        />
      )}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.container,
        {
          borderRadius,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {isIOS && variant !== 'primary' && variant !== 'secondary' ? (
        <BlurView
          intensity={intensity}
          tint={tint}
          style={[
            styles.blur,
            {
              borderRadius,
            },
          ]}
        >
          <View
            style={[
              styles.inner,
              {
                backgroundColor: colors.background,
                paddingVertical: isKidsEdition
                  ? theme.spacing.md
                  : theme.spacing.sm + 4,
                paddingHorizontal: theme.spacing.lg,
              },
            ]}
          >
            {renderContent()}
          </View>
        </BlurView>
      ) : (
        <View
          style={[
            styles.inner,
            {
              backgroundColor: colors.background,
              paddingVertical: isKidsEdition
                ? theme.spacing.md
                : theme.spacing.sm + 4,
              paddingHorizontal: theme.spacing.lg,
              borderRadius,
            },
          ]}
        >
          {renderContent()}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  blur: {
    overflow: 'hidden',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default GlassButton;
