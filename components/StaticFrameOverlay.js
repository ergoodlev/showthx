/**
 * StaticFrameOverlay
 * Creative, colorful static frame overlays using React Native components
 * NO external files needed - 100% ready to use
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/**
 * Render a creative static frame overlay
 */
export const StaticFrameOverlay = ({ frameId, style }) => {
  switch (frameId) {
    case 'rainbow-gradient':
      return <RainbowGradientFrame style={style} />;
    case 'confetti-static':
      return <ConfettiStaticFrame style={style} />;
    case 'star-burst':
      return <StarBurstFrame style={style} />;
    case 'heart-corners':
      return <HeartCornersFrame style={style} />;
    case 'neon-glow':
      return <NeonGlowFrame style={style} />;
    case 'sparkle-border':
      return <SparkleBorderFrame style={style} />;
    case 'bubble-party':
      return <BubblePartyFrame style={style} />;
    case 'geometric-modern':
      return <GeometricModernFrame style={style} />;
    case 'flower-power':
      return <FlowerPowerFrame style={style} />;
    case 'celebration-blast':
      return <CelebrationBlastFrame style={style} />;
    default:
      return null;
  }
};

// Rainbow Gradient Border - Visible thick gradient frame
const RainbowGradientFrame = ({ style }) => (
  <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
    {/* Outer gradient border */}
    <LinearGradient
      colors={['#FF6B6B', '#F59E0B', '#10B981', '#06b6d4', '#8B5CF6', '#EC4899']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        right: 8,
        bottom: 8,
        borderRadius: 20,
      }}
    />
    {/* Inner cutout to create border effect */}
    <View
      style={{
        position: 'absolute',
        top: 18,
        left: 18,
        right: 18,
        bottom: 18,
        borderRadius: 12,
        backgroundColor: 'transparent',
      }}
    />
  </View>
);

// Confetti Pattern (static colorful circles)
const ConfettiStaticFrame = ({ style }) => {
  const confettiColors = ['#FF6B6B', '#F59E0B', '#10B981', '#06b6d4', '#8B5CF6', '#EC4899'];
  const confettiPositions = [
    { top: '5%', left: '10%', color: confettiColors[0] },
    { top: '15%', right: '8%', color: confettiColors[1] },
    { top: '25%', left: '5%', color: confettiColors[2] },
    { top: '35%', right: '12%', color: confettiColors[3] },
    { top: '45%', left: '8%', color: confettiColors[4] },
    { top: '55%', right: '6%', color: confettiColors[5] },
    { top: '65%', left: '12%', color: confettiColors[0] },
    { top: '75%', right: '10%', color: confettiColors[1] },
    { top: '85%', left: '7%', color: confettiColors[2] },
    { top: '92%', right: '15%', color: confettiColors[3] },
    { bottom: '5%', left: '90%', color: confettiColors[4] },
    { bottom: '15%', left: '92%', color: confettiColors[5] },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {confettiPositions.map((pos, i) => (
        <View
          key={i}
          style={[
            styles.confettiDot,
            {
              top: pos.top,
              left: pos.left,
              right: pos.right,
              bottom: pos.bottom,
              backgroundColor: pos.color,
            },
          ]}
        />
      ))}
    </View>
  );
};

// Star Burst (stars in corners and edges)
const StarBurstFrame = ({ style }) => {
  const starPositions = [
    { top: 10, left: 10 },
    { top: 10, right: 10 },
    { bottom: 10, left: 10 },
    { bottom: 10, right: 10 },
    { top: '30%', left: 5 },
    { top: '30%', right: 5 },
    { top: '60%', left: 5 },
    { top: '60%', right: 5 },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {starPositions.map((pos, i) => (
        <Ionicons
          key={i}
          name="star"
          size={24}
          color="#FFD700"
          style={[styles.absoluteIcon, pos]}
        />
      ))}
    </View>
  );
};

// Heart Corners
const HeartCornersFrame = ({ style }) => {
  const heartColors = ['#FF6B6B', '#EC4899', '#F472B6', '#FB7185'];
  const heartPositions = [
    { top: 15, left: 15, color: heartColors[0], size: 28 },
    { top: 15, right: 15, color: heartColors[1], size: 28 },
    { bottom: 15, left: 15, color: heartColors[2], size: 28 },
    { bottom: 15, right: 15, color: heartColors[3], size: 28 },
    { top: '40%', left: 10, color: heartColors[0], size: 20 },
    { top: '40%', right: 10, color: heartColors[1], size: 20 },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {heartPositions.map((pos, i) => (
        <Ionicons
          key={i}
          name="heart"
          size={pos.size}
          color={pos.color}
          style={[styles.absoluteIcon, { top: pos.top, left: pos.left, right: pos.right, bottom: pos.bottom }]}
        />
      ))}
    </View>
  );
};

// Neon Glow Border - Enhanced visibility
const NeonGlowFrame = ({ style }) => (
  <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
    <View
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        bottom: 12,
        borderRadius: 16,
        borderWidth: 6,
        borderColor: '#06b6d4',
        shadowColor: '#06b6d4',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 16,
        elevation: 20,
      }}
    />
    {/* Additional inner glow */}
    <View
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        bottom: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#0891b2',
        opacity: 0.5,
      }}
    />
  </View>
);

// Sparkle Border (sparkle icons around edges)
const SparkleBorderFrame = ({ style }) => {
  const sparklePositions = Array.from({ length: 12 }, (_, i) => ({
    top: i < 3 ? 20 : i < 6 ? '50%' : '90%',
    left: (i % 3) === 0 ? '10%' : (i % 3) === 1 ? '50%' : '90%',
  }));

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {sparklePositions.map((pos, i) => (
        <Ionicons
          key={i}
          name="sparkles"
          size={20}
          color="#FFD700"
          style={[styles.absoluteIcon, pos]}
        />
      ))}
    </View>
  );
};

// Bubble Party (colorful circles)
const BubblePartyFrame = ({ style }) => {
  const bubbles = [
    { size: 60, top: '8%', left: '5%', color: '#06b6d4', opacity: 0.3 },
    { size: 45, top: '20%', right: '8%', color: '#8B5CF6', opacity: 0.3 },
    { size: 70, top: '40%', left: '3%', color: '#F59E0B', opacity: 0.25 },
    { size: 55, bottom: '25%', right: '5%', color: '#10B981', opacity: 0.3 },
    { size: 50, bottom: '10%', left: '8%', color: '#EC4899', opacity: 0.3 },
    { size: 40, top: '60%', right: '10%', color: '#FF6B6B', opacity: 0.35 },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {bubbles.map((bubble, i) => (
        <View
          key={i}
          style={[
            styles.bubble,
            {
              width: bubble.size,
              height: bubble.size,
              borderRadius: bubble.size / 2,
              backgroundColor: bubble.color,
              opacity: bubble.opacity,
              top: bubble.top,
              left: bubble.left,
              right: bubble.right,
              bottom: bubble.bottom,
            },
          ]}
        />
      ))}
    </View>
  );
};

// Geometric Modern (triangles and shapes)
const GeometricModernFrame = ({ style }) => {
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {/* Top triangles */}
      <View style={[styles.triangle, { top: 0, left: 0, borderBottomColor: '#06b6d4' }]} />
      <View style={[styles.triangle, { top: 0, right: 0, borderBottomColor: '#8B5CF6' }]} />
      {/* Bottom triangles */}
      <View style={[styles.triangleBottom, { bottom: 0, left: 0, borderTopColor: '#F59E0B' }]} />
      <View style={[styles.triangleBottom, { bottom: 0, right: 0, borderTopColor: '#EC4899' }]} />
    </View>
  );
};

// Flower Power (flower-like shapes using icons)
const FlowerPowerFrame = ({ style }) => {
  const flowers = [
    { top: 20, left: 20, color: '#EC4899' },
    { top: 20, right: 20, color: '#F59E0B' },
    { bottom: 20, left: 20, color: '#10B981' },
    { bottom: 20, right: 20, color: '#8B5CF6' },
    { top: '40%', left: 10, color: '#FF6B6B' },
    { top: '40%', right: 10, color: '#06b6d4' },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {flowers.map((flower, i) => (
        <Ionicons
          key={i}
          name="flower"
          size={28}
          color={flower.color}
          style={[styles.absoluteIcon, { top: flower.top, left: flower.left, right: flower.right, bottom: flower.bottom }]}
        />
      ))}
    </View>
  );
};

// Celebration Blast (multiple celebration icons)
const CelebrationBlastFrame = ({ style }) => {
  const icons = [
    { name: 'balloon', color: '#FF6B6B', top: 15, left: 15, size: 24 },
    { name: 'balloon', color: '#F59E0B', top: 15, right: 15, size: 24 },
    { name: 'gift', color: '#10B981', bottom: 15, left: 15, size: 24 },
    { name: 'gift', color: '#06b6d4', bottom: 15, right: 15, size: 24 },
    { name: 'happy', color: '#8B5CF6', top: '30%', left: 8, size: 20 },
    { name: 'happy', color: '#EC4899', top: '30%', right: 8, size: 20 },
    { name: 'sparkles', color: '#FFD700', top: '60%', left: 12, size: 18 },
    { name: 'sparkles', color: '#FFD700', top: '60%', right: 12, size: 18 },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {icons.map((icon, i) => (
        <Ionicons
          key={i}
          name={icon.name}
          size={icon.size}
          color={icon.color}
          style={[styles.absoluteIcon, { top: icon.top, left: icon.left, right: icon.right, bottom: icon.bottom }]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  confettiDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  absoluteIcon: {
    position: 'absolute',
  },
  bubble: {
    position: 'absolute',
  },
  triangle: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 40,
    borderRightWidth: 40,
    borderBottomWidth: 60,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    opacity: 0.4,
  },
  triangleBottom: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 40,
    borderRightWidth: 40,
    borderTopWidth: 60,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    opacity: 0.4,
  },
});

export default StaticFrameOverlay;
