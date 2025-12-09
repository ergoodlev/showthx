/**
 * CustomFrameOverlay
 * Renders custom frame templates created by parents in FrameCreationScreen
 * Supports all frame shapes: bold-classic, rounded-thick, double-border, polaroid, etc.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Render a custom frame overlay based on frameTemplate data
 * @param {object} frameTemplate - Frame template from database with frame_shape, primary_color, etc.
 */
export const CustomFrameOverlay = ({ frameTemplate, style }) => {
  if (!frameTemplate || !frameTemplate.frame_shape) {
    return null;
  }

  const {
    frame_shape,
    primary_color = '#06b6d4',
    border_width = 4,
    border_radius = 12,
  } = frameTemplate;

  // Get shape-specific styles
  const getShapeStyles = () => {
    const baseStyle = {
      borderColor: primary_color,
      borderWidth: border_width,
      borderRadius: border_radius,
    };

    switch (frame_shape) {
      case 'neon-glow':
        return {
          ...baseStyle,
          shadowColor: primary_color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1.0,
          shadowRadius: 20,
          elevation: 15,
        };

      case 'wavy-thick':
        return {
          ...baseStyle,
          borderStyle: 'dashed',
          shadowColor: primary_color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.6,
          shadowRadius: 10,
          elevation: 8,
        };

      case 'star-burst':
      case 'spikey-fun':
        return {
          ...baseStyle,
          shadowColor: primary_color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 15,
          elevation: 12,
        };

      case 'cloud-fluffy':
        return {
          ...baseStyle,
          shadowColor: primary_color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 8,
        };

      case 'heart-love':
        return {
          ...baseStyle,
          shadowColor: '#FF6B6B',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.6,
          shadowRadius: 15,
          elevation: 8,
        };

      case 'bold-classic':
        return {
          ...baseStyle,
          shadowColor: primary_color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 8,
        };

      case 'rounded-thick':
        return {
          ...baseStyle,
          shadowColor: primary_color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 8,
        };

      case 'polaroid':
        return {
          ...baseStyle,
          shadowColor: primary_color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 15,
          elevation: 8,
        };

      case 'scalloped-fancy':
        return {
          ...baseStyle,
          shadowColor: primary_color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 8,
        };

      case 'double-border':
        // Double border effect
        return {
          borderColor: primary_color,
          borderWidth: border_width,
          borderRadius: border_radius,
          shadowColor: primary_color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        };

      case 'gradient-frame':
        // Gradient will be handled separately below
        return {
          borderWidth: border_width,
          borderRadius: border_radius,
          shadowColor: primary_color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.7,
          shadowRadius: 12,
          elevation: 8,
        };

      default:
        return baseStyle;
    }
  };

  const shapeStyles = getShapeStyles();

  // Special rendering for gradient frames
  if (frame_shape === 'gradient-frame') {
    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        <LinearGradient
          colors={[primary_color, '#FFD93D', '#FF6B6B', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            borderRadius: border_radius,
          }}
        />
        {/* Inner cutout to create border effect */}
        <View
          style={{
            position: 'absolute',
            top: 8 + border_width,
            left: 8 + border_width,
            right: 8 + border_width,
            bottom: 8 + border_width,
            borderRadius: Math.max(0, border_radius - 4),
            backgroundColor: 'transparent',
          }}
        />
      </View>
    );
  }

  // Special rendering for double-border frames
  if (frame_shape === 'double-border') {
    const outerBorderWidth = 4;
    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        {/* Outer border */}
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            borderRadius: border_radius,
            borderWidth: outerBorderWidth,
            borderColor: primary_color,
            opacity: 0.5,
          }}
        />
        {/* Inner border */}
        <View
          style={{
            position: 'absolute',
            top: 8 + outerBorderWidth + 4,
            left: 8 + outerBorderWidth + 4,
            right: 8 + outerBorderWidth + 4,
            bottom: 8 + outerBorderWidth + 4,
            borderRadius: Math.max(0, border_radius - 4),
            borderWidth: border_width,
            borderColor: primary_color,
            ...shapeStyles,
          }}
        />
      </View>
    );
  }

  // Standard border frame
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          bottom: 8,
          ...shapeStyles,
        }}
      />
    </View>
  );
};

export default CustomFrameOverlay;
