/**
 * ThankCast - Main App Component
 *
 * Phase 2: UI Implementation
 * This app wrapper provides:
 * - Font loading (Nunito, Playfair, Montserrat, Inter)
 * - Edition-aware theming via EditionProvider
 * - Navigation structure for Phase 2 flows
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Font from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// Context & Providers
import { EditionProvider, useEdition } from './context/EditionContext';

// Navigation
import RootNavigator from './navigation/RootNavigator';

// Placeholder screens (to be implemented in Phase 2)
import SplashScreen from './screens/SplashScreen';

/**
 * Main App Content Component
 * Wrapped by EditionProvider and font loader
 */
const AppContent = () => {
  const [isReady, setIsReady] = useState(false);
  const { edition, theme } = useEdition();

  // Load custom fonts on app startup
  useEffect(() => {
    loadFonts();
  }, []);

  const loadFonts = async () => {
    try {
      // Initialize audio mode first (CRITICAL for iOS)
      console.log('🎵 Initializing audio mode at app startup...');
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: true, // MUST be true to support both video recording and music playback
      });
      console.log('✅ Audio mode initialized successfully');

      await Font.loadAsync({
        // Kids Edition Font
        'Nunito_Regular': Nunito_400Regular,
        'Nunito_SemiBold': Nunito_600SemiBold,
        'Nunito_Bold': Nunito_700Bold,

        // Adult Edition Fonts
        'PlayfairDisplay_Regular': PlayfairDisplay_400Regular,
        'PlayfairDisplay_Bold': PlayfairDisplay_700Bold,
        'Montserrat_Regular': Montserrat_400Regular,
        'Montserrat_SemiBold': Montserrat_600SemiBold,
        'Montserrat_Bold': Montserrat_700Bold,
        'Inter_Regular': Inter_400Regular,
        'Inter_SemiBold': Inter_600SemiBold,
        'Inter_Bold': Inter_700Bold,
      });
      setIsReady(true);
    } catch (error) {
      console.error('Error loading fonts:', error);
      // Continue anyway - system fonts will be used
      setIsReady(true);
    }
  };

  // Show splash screen while loading
  if (!isReady) {
    return (
      <View style={[styles.container, { backgroundColor: theme.neutralColors.white }]}>
        <SplashScreen />
      </View>
    );
  }

  // Main app content
  // Phase 2: Now using RootNavigator for full navigation structure
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={edition === 'kids' ? 'dark-content' : 'dark-content'}
        backgroundColor={theme.neutralColors.white}
      />
      <ExpoStatusBar style="dark" />

      {/* Phase 2: Complete Navigation Structure */}
      <RootNavigator />
    </View>
  );
};

/**
 * Root App Component
 * Wrapped with EditionProvider for edition-aware theming
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <EditionProvider>
        <AppContent />
      </EditionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

/**
 * Development Notes:
 *
 * 1. Font Loading:
 *    - Fonts are loaded asynchronously in AppContent
 *    - Splash screen shown during load
 *    - All screens should use theme.typography for font families
 *
 * 2. Edition System:
 *    - Change APP_EDITION in app-config.js to switch editions
 *    - EditionProvider wraps entire app
 *    - All screens use useEdition() hook to get theme
 *
 * 3. Navigation:
 *    - Phase 2 will implement react-native-navigation or expo-router
 *    - Different stacks for authenticated/unauthenticated users
 *    - Different stacks for parent/kid roles
 *
 * 4. Theme Usage:
 *    - All component styling should use theme from useEdition()
 *    - Never hardcode colors - use theme.colors
 *    - Never hardcode fonts - use theme.typography
 *    - Never hardcode spacing - use theme.spacing
 *
 * 5. Components:
 *    - All button components should use ThankCastButton variants
 *    - All text inputs should use custom TextField component
 *    - All modals should use custom Modal component
 *
 * 6. Supabase Integration:
 *    - Initialize auth state on app startup
 *    - Setup auth listener for session changes
 *    - Setup error handling and network issues
 */
