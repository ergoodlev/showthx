/**
 * ThankCast - Main App Component
 *
 * Phase 2: UI Implementation
 * This app wrapper provides:
 * - Font loading (Nunito, Playfair, Montserrat, Inter)
 * - Edition-aware theming via EditionProvider
 * - Navigation structure for Phase 2 flows
 * - Sentry error tracking for production monitoring
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
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

// Sentry Configuration
import { SENTRY_DSN } from './config/sentry';

// Context & Providers
import { EditionProvider, useEdition } from './context/EditionContext';
import { DataSyncProvider } from './context/DataSyncContext';

// Navigation
import RootNavigator from './navigation/RootNavigator';

// Debug Logging
import { initRemoteLogger } from './services/remoteLogger';

// Initialize Sentry for error tracking in production
// Wrapped in try-catch to prevent blocking app startup if Sentry fails
try {
  if (SENTRY_DSN && SENTRY_DSN !== 'YOUR_SENTRY_DSN_HERE') {
    console.log('🔧 Initializing Sentry...');
    Sentry.init({
      dsn: SENTRY_DSN,
      // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
      // Reduce this in production to save quota
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      // Enable auto session tracking
      enableAutoSessionTracking: true,
      // Session tracking interval
      sessionTrackingIntervalMillis: 30000,
      // Enable native crash tracking
      enableNative: true,
      // Attach stack trace to errors
      attachStacktrace: true,
      // Environment
      environment: __DEV__ ? 'development' : 'production',
      // Release tracking (optional - set this to your app version)
      // release: 'gratitugram@1.0.0',
      // beforeSend callback to filter/modify events before sending
      beforeSend(event, hint) {
        // Don't send events in development unless you want to test
        if (__DEV__) {
          console.log('Sentry Event (DEV - not sent):', event);
          return null; // Don't send in dev
        }
        return event;
      },
      // Integrations
      integrations: [
        new Sentry.ReactNativeTracing({
          // Enable route tracking
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
          // Enable automatic HTTP request tracking
          tracingOrigins: ['localhost', 'supabase.co', /^\//],
        }),
      ],
    });
    console.log('✅ Sentry initialized successfully');
  } else {
    console.log('⚠️ Sentry DSN not configured - skipping Sentry initialization');
  }
} catch (error) {
  console.error('❌ Failed to initialize Sentry:', error);
  console.error('App will continue without Sentry error tracking');
}

// Initialize remote logger for debugging in production
try {
  initRemoteLogger();
  console.log('✅ Remote logger initialized');
} catch (error) {
  console.error('❌ Failed to initialize remote logger:', error);
}

// Prevent native splash from auto-hiding
SplashScreen.preventAutoHideAsync();

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

      // Hide native splash screen - our custom splash in RootNavigator will show
      await SplashScreen.hideAsync();
      setIsReady(true);
    } catch (error) {
      console.error('Error loading fonts:', error);
      // Hide splash even on error
      await SplashScreen.hideAsync();
      // Continue anyway - system fonts will be used
      setIsReady(true);
    }
  };

  // Native splash will show while loading - no need to render anything
  if (!isReady) {
    return null;
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
 * Wrapped with Sentry ErrorBoundary for crash reporting
 */
export default Sentry.wrap(function App() {
  return (
    <SafeAreaProvider>
      <EditionProvider>
        <DataSyncProvider>
          <Sentry.ErrorBoundary
            fallback={({ error, componentStack, resetError }) => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
                  Oops! Something went wrong
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
                  We've been notified and will fix this soon.
                </Text>
                <TouchableOpacity
                  onPress={resetError}
                  style={{
                    backgroundColor: '#FF6B6B',
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Try Again</Text>
                </TouchableOpacity>
                {__DEV__ && (
                  <View style={{ marginTop: 20, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#DC2626' }}>
                      {error.toString()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          >
            <AppContent />
          </Sentry.ErrorBoundary>
        </DataSyncProvider>
      </EditionProvider>
    </SafeAreaProvider>
  );
});

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
