/**
 * ShowThx Button Components
 * Edition-aware button components with consistent styling across the app
 * All buttons use the design system and respond to edition changes
 *
 * Brand Colors:
 * - Primary: #8360c3 (purple)
 * - Secondary: #2ebf91 (teal)
 * - Gradient: purple → teal
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEdition } from '../context/EditionContext';
import { getThemeByEdition, Gradients, Colors } from '../theme/thankcast-design-system';

/**
 * Primary Button Component
 * Main action button with edition-aware theming
 * Supports gradient background for kids edition
 */
export const ThankCastButton = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  gradient = false,
  style,
  textStyle,
  ...props
}) => {
  const { edition } = useEdition();
  const theme = getThemeByEdition(edition);

  const isKidsEdition = edition === 'kids';
  const buttonHeight = isKidsEdition ? 56 : 48;
  const borderRadius = isKidsEdition ? theme.borderRadius.large : theme.borderRadius.large;

  const buttonStyle = [
    styles.button,
    {
      height: buttonHeight,
      borderRadius: borderRadius,
      backgroundColor: !gradient ? theme.brandColors.coral : 'transparent',
      opacity: disabled ? 0.6 : 1,
    },
    style,
  ];

  const textColor = {
    color: '#FFFFFF',
    ...theme.typography.button,
    fontWeight: '600',
  };

  const content = (
    <View style={[styles.buttonContent, { justifyContent: 'center', alignItems: 'center' }]}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text style={[textColor, textStyle]} numberOfLines={1}>
          {title}
        </Text>
      )}
    </View>
  );

  if (gradient) {
    // Use ShowThx brand gradient: purple (#8360c3) → teal (#2ebf91)
    const gradientColors = [Colors.brand.purple, Colors.brand.teal];
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[buttonStyle, { paddingVertical: 0 }]}
      >
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled || loading}
          activeOpacity={0.8}
          style={[styles.buttonContent, { height: buttonHeight }]}
          {...props}
        >
          {content}
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={buttonStyle}
      {...props}
    >
      {content}
    </TouchableOpacity>
  );
};

/**
 * Secondary Button Component
 * Secondary action button for alternative actions
 * Uses secondary color from design system (teal)
 */
export const ThankCastSecondaryButton = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...props
}) => {
  const { edition } = useEdition();
  const theme = getThemeByEdition(edition);

  const isKidsEdition = edition === 'kids';
  const buttonHeight = isKidsEdition ? 56 : 48;
  const borderRadius = isKidsEdition ? theme.borderRadius.large : theme.borderRadius.large;

  const buttonStyle = [
    styles.button,
    {
      height: buttonHeight,
      borderRadius: borderRadius,
      backgroundColor: theme.brandColors.teal,
      opacity: disabled ? 0.6 : 1,
    },
    style,
  ];

  const textColor = {
    color: '#FFFFFF',
    ...theme.typography.button,
    fontWeight: '600',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={buttonStyle}
      {...props}
    >
      <View style={[styles.buttonContent, { justifyContent: 'center', alignItems: 'center' }]}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={[textColor, textStyle]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

/**
 * Outline Button Component
 * Tertiary button with outline style
 * Uses border instead of solid fill
 */
export const ThankCastOutlineButton = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...props
}) => {
  const { edition } = useEdition();
  const theme = getThemeByEdition(edition);

  const isKidsEdition = edition === 'kids';
  const buttonHeight = isKidsEdition ? 56 : 48;
  const borderRadius = isKidsEdition ? theme.borderRadius.large : theme.borderRadius.large;
  const borderColor = theme.brandColors.coral;
  const borderWidth = isKidsEdition ? 2 : 1.5;

  const buttonStyle = [
    styles.button,
    {
      height: buttonHeight,
      borderRadius: borderRadius,
      backgroundColor: 'transparent',
      borderWidth: borderWidth,
      borderColor: borderColor,
      opacity: disabled ? 0.6 : 1,
    },
    style,
  ];

  const textColor = {
    color: borderColor,
    ...theme.typography.button,
    fontWeight: '600',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={buttonStyle}
      {...props}
    >
      <View style={[styles.buttonContent, { justifyContent: 'center', alignItems: 'center' }]}>
        {loading ? (
          <ActivityIndicator color={borderColor} size="small" />
        ) : (
          <Text style={[textColor, textStyle]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

/**
 * Record Button Component
 * Large circular button for video recording
 * Big red circle with recording indicator (circle when idle, square when recording)
 */
export const ThankCastRecordButton = ({
  onPress,
  isRecording = false,
  disabled = false,
  style,
  ...props
}) => {
  const { edition } = useEdition();
  const theme = getThemeByEdition(edition);

  const isKidsEdition = edition === 'kids';
  const size = isKidsEdition ? 80 : 72;
  const innerSize = size * 0.6;

  const buttonStyle = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.brandColors.coral,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: disabled ? 0.6 : 1,
    },
    theme.shadows.large,
    style,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={buttonStyle}
      {...props}
    >
      <View
        style={[
          {
            width: innerSize,
            height: innerSize,
            backgroundColor: '#FFFFFF',
            borderRadius: isRecording ? 4 : innerSize / 2,
          },
          isRecording && styles.recordingSquare,
        ]}
      />
    </TouchableOpacity>
  );
};

/**
 * Small Button Component
 * Compact button for secondary actions or form submissions
 */
export const ThankCastSmallButton = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  variant = 'primary', // 'primary', 'secondary', 'outline'
  style,
  textStyle,
  ...props
}) => {
  const { edition } = useEdition();
  const theme = getThemeByEdition(edition);

  const isKidsEdition = edition === 'kids';
  const buttonHeight = isKidsEdition ? 44 : 40;
  const borderRadius = isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small;
  const paddingHorizontal = isKidsEdition ? theme.spacing.md : theme.spacing.sm;

  let backgroundColor = theme.brandColors.coral;
  let textColor = '#FFFFFF';
  let borderColor = 'transparent';
  let borderWidth = 0;

  if (variant === 'secondary') {
    backgroundColor = theme.brandColors.teal;
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    textColor = theme.brandColors.coral;
    borderColor = theme.brandColors.coral;
    borderWidth = 1.5;
  }

  const buttonStyle = [
    {
      height: buttonHeight,
      paddingHorizontal: paddingHorizontal,
      borderRadius: borderRadius,
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      borderWidth: borderWidth,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      opacity: disabled ? 0.6 : 1,
    },
    style,
  ];

  const textColorStyle = {
    color: textColor,
    ...theme.typography.caption,
    fontWeight: '600',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={buttonStyle}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[textColorStyle, textStyle]} numberOfLines={1}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Icon Button Component
 * Compact circular button with optional icon
 */
export const ThankCastIconButton = ({
  onPress,
  icon,
  disabled = false,
  size = 'medium',
  variant = 'primary',
  style,
  ...props
}) => {
  const { edition } = useEdition();
  const theme = getThemeByEdition(edition);

  const isKidsEdition = edition === 'kids';
  let buttonSize = isKidsEdition ? 48 : 44;

  if (size === 'small') {
    buttonSize = isKidsEdition ? 40 : 36;
  } else if (size === 'large') {
    buttonSize = isKidsEdition ? 56 : 52;
  }

  let backgroundColor = theme.brandColors.coral;
  if (variant === 'secondary') {
    backgroundColor = theme.brandColors.teal;
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
  }

  const buttonStyle = [
    {
      width: buttonSize,
      height: buttonSize,
      borderRadius: buttonSize / 2,
      backgroundColor: backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: variant === 'outline' ? 2 : 0,
      borderColor: variant === 'outline' ? theme.brandColors.coral : 'transparent',
      opacity: disabled ? 0.6 : 1,
    },
    theme.shadows.small,
    style,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={buttonStyle}
      {...props}
    >
      {icon}
    </TouchableOpacity>
  );
};

// Internal styles
const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  recordingSquare: {
    borderRadius: 4,
  },
});

export default ThankCastButton;
