/**
 * Edition Context
 * Provides app edition (kids, wedding, pro) to all components
 * Allows conditional rendering and styling based on edition
 *
 * Usage:
 * import { useEdition } from '../context/EditionContext';
 *
 * const MyComponent = () => {
 *   const { edition, theme, showParentalFeatures } = useEdition();
 *   return (
 *     <View>
 *       {showParentalFeatures && <ParentDashboard />}
 *       <Text style={theme.typography.h1}>Welcome!</Text>
 *     </View>
 *   );
 * };
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getThemeByEdition } from '../theme/thankcast-design-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EditionContext = createContext();

/**
 * Edition configuration
 * Current app is ThankCast Kids
 * Future apps: ThankCast Wedding, ThankCast Pro
 */
const EDITIONS = {
  KIDS: 'kids',
  WEDDING: 'wedding',
  PRO: 'pro',
};

const EDITION_CONFIG = {
  kids: {
    name: 'ThankCast Kids',
    subtitle: 'Record Thank You Videos',
    showParentalFeatures: true, // Parent consent, PIN logins, parental dashboard
    showMarketplace: false, // No monetization for kids
    maxVideoDuration: 60, // seconds
    allowedAudience: ['family', 'school', 'friends'],
    defaultAgeGroup: 'children', // 5-17
  },
  wedding: {
    name: 'ThankCast Wedding',
    subtitle: 'Share Your Love Story',
    showParentalFeatures: false, // Adults, no parental features
    showMarketplace: true, // Premium features, prints, etc.
    maxVideoDuration: 120, // seconds
    allowedAudience: ['guests', 'public'],
    defaultAgeGroup: 'adults', // 18+
  },
  pro: {
    name: 'ThankCast Pro',
    subtitle: 'Professional Video Creation',
    showParentalFeatures: false, // Professional context
    showMarketplace: true, // Full marketplace
    maxVideoDuration: 300, // 5 minutes
    allowedAudience: ['team', 'public'],
    defaultAgeGroup: 'professionals', // 18+
  },
};

export const EditionProvider = ({ children, initialEdition = 'kids' }) => {
  const [edition, setEdition] = useState(initialEdition);
  const [theme, setTheme] = useState(getThemeByEdition(initialEdition));

  // Load saved edition preference on mount
  useEffect(() => {
    loadEditionPreference();
  }, []);

  // Update theme when edition changes
  useEffect(() => {
    setTheme(getThemeByEdition(edition));
  }, [edition]);

  const loadEditionPreference = async () => {
    try {
      const savedEdition = await AsyncStorage.getItem('thankcast_edition');
      if (savedEdition && Object.values(EDITIONS).includes(savedEdition)) {
        setEdition(savedEdition);
      }
    } catch (error) {
      console.error('[EDITION] Failed to load edition preference:', error);
    }
  };

  const switchEdition = async (newEdition) => {
    if (!Object.values(EDITIONS).includes(newEdition)) {
      console.error('[EDITION] Invalid edition:', newEdition);
      return;
    }

    try {
      setEdition(newEdition);
      await AsyncStorage.setItem('thankcast_edition', newEdition);
      console.log('[EDITION] Switched to edition:', newEdition);
    } catch (error) {
      console.error('[EDITION] Failed to switch edition:', error);
    }
  };

  const config = EDITION_CONFIG[edition] || EDITION_CONFIG.kids;

  const value = {
    edition,
    switchEdition,
    theme,
    config,

    // Convenience accessors
    appName: config.name,
    showParentalFeatures: config.showParentalFeatures,
    showMarketplace: config.showMarketplace,
    maxVideoDuration: config.maxVideoDuration,
    isKidsEdition: edition === EDITIONS.KIDS,
    isWeddingEdition: edition === EDITIONS.WEDDING,
    isProEdition: edition === EDITIONS.PRO,

    // Feature flags
    hasParentalConsent: config.showParentalFeatures,
    hasPremiumFeatures: edition !== EDITIONS.KIDS,
    allowsPublicSharing: config.allowedAudience.includes('public'),
  };

  return (
    <EditionContext.Provider value={value}>
      {children}
    </EditionContext.Provider>
  );
};

/**
 * Hook to use edition context
 * @returns {object} Edition context value
 */
export const useEdition = () => {
  const context = useContext(EditionContext);
  if (!context) {
    throw new Error('useEdition must be used within EditionProvider');
  }
  return context;
};

/**
 * Higher-order component for edition-aware components
 * @param {React.Component} Component - Component to wrap
 * @param {string} requiredEdition - Edition that component requires (optional)
 * @returns {React.Component} - Wrapped component
 */
export const withEdition = (Component, requiredEdition = null) => {
  return (props) => {
    const edition = useEdition();

    // If component requires specific edition, check it
    if (requiredEdition && edition.edition !== requiredEdition) {
      return null; // Don't render in wrong edition
    }

    return <Component {...props} edition={edition} />;
  };
};

/**
 * Conditional renderer based on edition
 * @param {string} edition - Edition to show
 * @param {React.ReactNode} children - Content to render
 * @returns {React.Component} - Conditional component
 */
export const EditionGate = ({ edition, children }) => {
  const { edition: currentEdition } = useEdition();
  return currentEdition === edition ? children : null;
};

/**
 * Multi-edition renderer
 * @param {object} editionContent - Map of edition to content
 * @returns {React.Component} - Conditional component
 */
export const EditionContent = ({ kids, wedding, pro }) => {
  const { edition } = useEdition();

  const content = {
    kids,
    wedding,
    pro,
  };

  return content[edition] || kids; // Default to kids
};

/**
 * Get readable edition name
 * @param {string} edition - Edition key
 * @returns {string} - Readable name
 */
export function getEditionName(edition) {
  return EDITION_CONFIG[edition]?.name || 'ThankCast';
}

/**
 * Check if feature is available in edition
 * @param {string} feature - Feature name
 * @param {string} edition - Edition to check
 * @returns {boolean} - Whether feature is available
 */
export function isFeatureAvailable(feature, edition) {
  const config = EDITION_CONFIG[edition] || EDITION_CONFIG.kids;

  const features = {
    parentalConsent: config.showParentalFeatures,
    parentalDashboard: config.showParentalFeatures,
    guestManagement: true, // All editions
    videoRecording: true, // All editions
    videoMerging: true, // All editions
    musicSelection: true, // All editions
    marketplace: config.showMarketplace,
    premiumDownload: config.showMarketplace,
    advancedEditing: config.showMarketplace,
    analyticsSharing: config.showMarketplace,
  };

  return features[feature] || false;
}

export default EditionContext;
