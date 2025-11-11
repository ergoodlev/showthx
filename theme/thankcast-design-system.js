/**
 * ThankCast Design System
 * Expo/React Native Compatible
 * Supports multiple editions: Kids, Wedding, Pro
 *
 * Usage:
 * import { Colors, Typography, Spacing, BorderRadius } from './thankcast-design-system';
 * import { useTheme } from '../context/ThemeContext'; // for edition-aware theming
 */

import { Dimensions } from 'react-native';

// ============================================
// COLORS
// ============================================

export const Colors = {
  // Core Brand Colors (All Versions)
  brand: {
    coral: '#FF6B6B',
    coralLight: '#FF8A8A',
    coralDark: '#E85555',
    teal: '#4ECDC4',
    tealLight: '#6ED9D2',
    tealDark: '#3AB8B0',
    cream: '#FFF8F0',
    creamDark: '#FFF0E0',
  },

  // Kids Edition Colors
  kids: {
    sunshineYellow: '#FFD93D',
    skyBlue: '#A8E6CF',
    gentlePurple: '#C4A1E0',
    peachyPink: '#FFABAB',
    coral: '#FF6B6B', // Same as brand
    teal: '#4ECDC4',  // Same as brand
  },

  // Wedding/Adult Edition Colors
  wedding: {
    champagneGold: '#D4AF37',
    dustyRose: '#D4A5A5',
    deepForest: '#2D4739',
    sage: '#8BA888',
    coral: '#FF6B6B', // Same as brand but used more subtly
    teal: '#4ECDC4',  // Same as brand but muted in use
  },

  // Neutrals (All Versions)
  neutral: {
    white: '#FFFFFF',
    cream: '#FFF8F0',
    lightGray: '#F5F5F5',
    gray: '#9CA3AF',
    darkGray: '#6B7280',
    charcoal: '#36454F',
    black: '#000000',
  },

  // Semantic Colors
  semantic: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },

  // Video Player
  video: {
    controls: '#4ECDC4',
    controlsBackground: 'rgba(0, 0, 0, 0.6)',
    progress: '#FF6B6B',
    progressBackground: 'rgba(255, 255, 255, 0.3)',
  },
};

// ============================================
// TYPOGRAPHY
// ============================================

export const Typography = {
  // Kids Edition Typography
  kids: {
    h1: {
      fontFamily: 'Nunito-ExtraBold',
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.5,
      fontWeight: '800',
    },
    h2: {
      fontFamily: 'Nunito-Bold',
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.3,
      fontWeight: '700',
    },
    h3: {
      fontFamily: 'Nunito-Bold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: 0,
      fontWeight: '700',
    },
    body: {
      fontFamily: 'Nunito-Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '400',
    },
    bodyBold: {
      fontFamily: 'Nunito-Bold',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '700',
    },
    caption: {
      fontFamily: 'Nunito-Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      fontWeight: '400',
    },
    button: {
      fontFamily: 'Nunito-Bold',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.5,
      fontWeight: '700',
    },
  },

  // Adult/Wedding Edition Typography
  adult: {
    h1: {
      fontFamily: 'Playfair Display',
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.5,
      fontWeight: '700',
    },
    h2: {
      fontFamily: 'Montserrat',
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.3,
      fontWeight: '600',
    },
    h3: {
      fontFamily: 'Montserrat',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: 0,
      fontWeight: '600',
    },
    body: {
      fontFamily: 'Inter',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '400',
    },
    bodyBold: {
      fontFamily: 'Inter',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '600',
    },
    caption: {
      fontFamily: 'Inter',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      fontWeight: '400',
    },
    button: {
      fontFamily: 'Montserrat',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.5,
      fontWeight: '600',
    },
  },
};

// ============================================
// SPACING
// ============================================

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Kids Edition (more generous)
  kids: {
    xs: 6,
    sm: 12,
    md: 20,
    lg: 28,
    xl: 36,
    xxl: 52,
    xxxl: 68,
  },

  // Adult Edition (efficient)
  adult: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
};

// ============================================
// BORDER RADIUS
// ============================================

export const BorderRadius = {
  // Kids Edition (very rounded)
  kids: {
    small: 12,
    medium: 16,
    large: 20,
    xlarge: 24,
    pill: 999,
  },

  // Adult Edition (subtle rounds)
  adult: {
    small: 6,
    medium: 8,
    large: 12,
    xlarge: 16,
    pill: 999,
  },
};

// ============================================
// SHADOWS (Expo compatible)
// ============================================

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ============================================
// BUTTON STYLES
// ============================================

export const ButtonStyles = {
  kids: {
    primary: {
      backgroundColor: Colors.brand.coral,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: BorderRadius.kids.large,
      minHeight: 56,
    },
    secondary: {
      backgroundColor: Colors.brand.teal,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: BorderRadius.kids.large,
      minHeight: 56,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: Colors.brand.coral,
      paddingVertical: 14,
      paddingHorizontal: 30,
      borderRadius: BorderRadius.kids.large,
      minHeight: 56,
    },
  },

  adult: {
    primary: {
      backgroundColor: Colors.brand.coral,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: BorderRadius.adult.medium,
      minHeight: 48,
    },
    secondary: {
      backgroundColor: Colors.brand.teal,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: BorderRadius.adult.medium,
      minHeight: 48,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: Colors.brand.coral,
      paddingVertical: 12.5,
      paddingHorizontal: 22.5,
      borderRadius: BorderRadius.adult.medium,
      minHeight: 48,
    },
  },
};

// ============================================
// GRADIENTS (for use with expo-linear-gradient)
// ============================================

export const Gradients = {
  kids: {
    coralToYellow: {
      colors: [Colors.brand.coral, Colors.kids.sunshineYellow],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    tealToBlue: {
      colors: [Colors.brand.teal, Colors.kids.skyBlue],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    rainbow: {
      colors: [
        Colors.brand.coral,
        Colors.kids.sunshineYellow,
        Colors.kids.skyBlue,
        Colors.kids.gentlePurple,
      ],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },

  adult: {
    coral: {
      colors: [Colors.brand.coral, Colors.brand.coralDark],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
    elegant: {
      colors: [Colors.brand.coral, Colors.wedding.dustyRose],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },
};

// ============================================
// ANIMATION DURATIONS (in milliseconds)
// ============================================

export const Animation = {
  fast: 150,
  normal: 250,
  slow: 350,
  verySlow: 500,
};

// ============================================
// SCREEN DIMENSIONS HELPERS
// ============================================

export const Screen = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height,
};

// ============================================
// VIDEO DIMENSIONS
// ============================================

export const Video = {
  aspectRatio: 9 / 16, // Portrait (Stories/TikTok format)
  maxWidth: Screen.width,
  maxHeight: Screen.height * 0.7,
};

// ============================================
// ICON SIZES
// ============================================

export const IconSizes = {
  xs: 12,
  small: 16,
  medium: 24,
  large: 32,
  xlarge: 48,

  kids: {
    small: 20,
    medium: 28,
    large: 36,
    xlarge: 52,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get theme values based on edition
 * @param {string} edition - 'kids' or 'adult'
 * @returns {object} - Theme object with colors, typography, spacing, etc.
 */
export function getThemeByEdition(edition = 'kids') {
  const isKids = edition === 'kids';

  return {
    colors: isKids ? Colors.kids : Colors.wedding,
    brandColors: Colors.brand,
    neutralColors: Colors.neutral,
    semanticColors: Colors.semantic,
    videoColors: Colors.video,
    typography: isKids ? Typography.kids : Typography.adult,
    spacing: isKids ? Spacing.kids : Spacing.adult,
    borderRadius: isKids ? BorderRadius.kids : BorderRadius.adult,
    shadows: Shadows,
    buttons: isKids ? ButtonStyles.kids : ButtonStyles.adult,
    gradients: isKids ? Gradients.kids : Gradients.adult,
    animation: Animation,
    iconSizes: isKids ? IconSizes.kids : IconSizes,
  };
}

/**
 * Get primary color for edition
 * @param {string} edition - 'kids' or 'adult'
 * @returns {string} - Primary color hex
 */
export function getPrimaryColor(edition = 'kids') {
  return Colors.brand.coral;
}

/**
 * Get secondary color for edition
 * @param {string} edition - 'kids' or 'adult'
 * @returns {string} - Secondary color hex
 */
export function getSecondaryColor(edition = 'kids') {
  return Colors.brand.teal;
}

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  ButtonStyles,
  Gradients,
  Animation,
  Screen,
  Video,
  IconSizes,
  getThemeByEdition,
  getPrimaryColor,
  getSecondaryColor,
};
