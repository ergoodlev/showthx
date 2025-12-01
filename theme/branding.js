/**
 * GratituGram Branding & Theme System
 * Centralized theme configuration for colors, typography, logos, and styling
 * Ready to integrate custom branding package
 */

/**
 * Current Default Branding (will be replaced with user's custom branding)
 * To integrate your branding:
 * 1. Replace colors with your palette
 * 2. Add your logo files to /assets/branding/
 * 3. Update font families and sizes
 * 4. Customize component styles
 */

export const BRANDING = {
  // ========================================
  // Color Palette
  // ========================================
  colors: {
    // Primary colors (teal/cyan in current design)
    primary: '#06B6D4', // Cyan
    primaryDark: '#0891B2', // Darker cyan
    primaryLight: '#06B6D4', // Light cyan

    // Secondary colors
    secondary: '#1E40AF', // Blue
    secondaryDark: '#1E3A8A', // Darker blue

    // Status colors
    success: '#10B981', // Green
    warning: '#D97706', // Amber
    error: '#EF4444', // Red
    info: '#3B82F6', // Blue

    // Neutral colors
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',

    // Background colors
    bgLight: '#F8FAFB', // Light background
    bgDark: '#0F172A', // Dark background (for splash)
    bgCard: '#FFFFFF',
    bgCardDark: '#1A2332',

    // Gradient colors
    gradientStart: '#06B6D4',
    gradientEnd: '#0891B2',
  },

  // ========================================
  // Typography
  // ========================================
  typography: {
    // Font families
    fontFamily: {
      default: 'System', // Platform default
      bold: 'System',
      heading: 'System',
    },

    // Font sizes (in pixels)
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 28,
      '4xl': 32,
      '5xl': 36,
    },

    // Font weights
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },

    // Line heights
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },

    // Letter spacing
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
    },
  },

  // ========================================
  // Spacing
  // ========================================
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
  },

  // ========================================
  // Border Radius
  // ========================================
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    full: 9999,
  },

  // ========================================
  // Shadows
  // ========================================
  shadows: {
    none: 'none',
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3.84,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 6.46,
      elevation: 12,
    },
  },

  // ========================================
  // Logo & Assets
  // ========================================
  assets: {
    logoUrl: require('../assets/logo.png'), // Replace with your logo
    logoSmallUrl: require('../assets/logo-small.png'), // Smaller version
    logoDarkUrl: require('../assets/logo-dark.png'), // Dark theme version
    splashImageUrl: require('../assets/splash.png'), // Splash screen image
    // Add more assets as needed
  },

  // ========================================
  // Component Styles
  // ========================================
  components: {
    button: {
      primary: {
        backgroundColor: '#06B6D4',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
      },
      secondary: {
        backgroundColor: '#1E40AF',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
      },
    },

    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 3,
    },

    input: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
    },

    header: {
      backgroundColor: '#FFFFFF',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },

    tab: {
      backgroundColor: '#F9FAFB',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },

    tabActive: {
      borderBottomColor: '#06B6D4',
    },
  },

  // ========================================
  // Gradients
  // ========================================
  gradients: {
    primary: ['#06B6D4', '#0891B2'],
    primaryReverse: ['#0891B2', '#06B6D4'],
    secondary: ['#1E40AF', '#1E3A8A'],
    splash: ['#1E293B', '#0F172A', '#000000'],
  },

  // ========================================
  // App Metadata
  // ========================================
  appName: 'GratituGram',
  appTagline: 'Gratitude in Motion',
  appVersion: '2.0.0',
  appCompany: 'GratituGram Inc.',
};

/**
 * Helper: Create responsive spacing based on screen size
 * @param {object} screen - Screen dimensions
 * @returns {object} - Responsive spacing values
 */
export function getResponsiveSpacing(screenWidth) {
  const isSmallScreen = screenWidth < 600;
  const isMediumScreen = screenWidth >= 600 && screenWidth < 1024;

  return {
    paddingHorizontal: isSmallScreen ? 16 : 24,
    paddingVertical: isSmallScreen ? 12 : 16,
    cardMargin: isSmallScreen ? 8 : 12,
    borderRadius: isSmallScreen ? 8 : 12,
  };
}

/**
 * Helper: Get text color based on background color (for contrast)
 * @param {string} backgroundColor - Hex color
 * @returns {string} - Black or white text color for best contrast
 */
export function getContrastTextColor(backgroundColor) {
  const rgb = parseInt(backgroundColor.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 186 ? '#000000' : '#FFFFFF';
}

/**
 * Helper: Apply opacity to a color
 * @param {string} color - Hex color
 * @param {number} opacity - Opacity from 0-1
 * @returns {string} - RGBA color string
 */
export function applyOpacity(color, opacity) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Helper: Get brand color based on context
 * @param {string} context - Context: 'primary', 'success', 'warning', 'error'
 * @returns {string} - Hex color
 */
export function getBrandColor(context = 'primary') {
  const contextMap = {
    primary: BRANDING.colors.primary,
    success: BRANDING.colors.success,
    warning: BRANDING.colors.warning,
    error: BRANDING.colors.error,
    info: BRANDING.colors.info,
    secondary: BRANDING.colors.secondary,
  };
  return contextMap[context] || BRANDING.colors.primary;
}

/**
 * INTEGRATION CHECKLIST
 * =====================
 * To integrate your custom branding:
 *
 * 1. [ ] Color Palette
 *    - Update BRANDING.colors with your colors
 *    - Test color contrast for accessibility
 *
 * 2. [ ] Logo Assets
 *    - Add logo files to /assets/branding/
 *    - Update BRANDING.assets.logoUrl, etc.
 *
 * 3. [ ] Typography
 *    - Update font families if custom fonts
 *    - Adjust font sizes if needed
 *
 * 4. [ ] Component Styles
 *    - Update button, card, input styles
 *    - Ensure consistent padding/margins
 *
 * 5. [ ] Gradients
 *    - Update gradient definitions to match your brand
 *
 * 6. [ ] Testing
 *    - Test all screens with new colors
 *    - Verify logos display correctly
 *    - Check dark mode if supported
 *
 * Upload your branding package and I'll integrate it!
 */
