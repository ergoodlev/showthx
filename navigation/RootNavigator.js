/**
 * RootNavigator
 * Main navigation structure connecting parent and kid flows
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, AppState, Image, Alert, TouchableOpacity, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useEdition } from '../context/EditionContext';
import { scheduleAutomaticCleanup } from '../services/dataRetentionService';
import { registerForPushNotifications, addNotificationResponseListener } from '../services/notificationService';
import { supabase } from '../supabaseClient';

// Screen imports - Parent flows
import ParentSignupScreen from '../screens/ParentSignupScreen';
import ParentLoginScreen from '../screens/ParentLoginScreen';
import ParentDashboardScreen from '../screens/ParentDashboardScreen';
import EventManagementScreen from '../screens/EventManagementScreen';
import GiftManagementScreen from '../screens/GiftManagementScreen';
import ManageChildrenScreen from '../screens/ManageChildrenScreen';
import GuestManagementScreen from '../screens/GuestManagementScreen';
import ParentVideoReviewScreen from '../screens/ParentVideoReviewScreen';
import SendToGuestsScreen from '../screens/SendToGuestsScreen';
import SendSuccessScreen from '../screens/SendSuccessScreen';
import FrameCreationScreen from '../screens/FrameCreationScreen';
import PrivacyDashboardScreen from '../screens/PrivacyDashboardScreen';

// Screen imports - Kid flows
import KidPINLoginScreen from '../screens/KidPINLoginScreen';
import KidPendingGiftsScreen from '../screens/KidPendingGiftsScreen';
import FrameDecorationScreen from '../screens/FrameDecorationScreen';
import VideoRecordingScreen from '../screens/VideoRecordingScreen';
import VideoPlaybackScreen from '../screens/VideoPlaybackScreen';
import FrameSelectionScreen from '../screens/FrameSelectionScreen';
import VideoCustomizationScreen from '../screens/VideoCustomizationScreen';
import VideoConfirmationScreen from '../screens/VideoConfirmationScreen';
import VideoSuccessScreen from '../screens/VideoSuccessScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Parent App Stack (logged in)
const ParentAppStack = () => {
  const { theme } = useEdition();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ParentDashboard" component={ParentDashboardScreen} />
      <Stack.Screen name="EventManagement" component={EventManagementScreen} />
      <Stack.Screen name="GiftManagement" component={GiftManagementScreen} />
      <Stack.Screen name="ManageChildren" component={ManageChildrenScreen} />
      <Stack.Screen name="GuestManagement" component={GuestManagementScreen} />
      <Stack.Screen name="ParentVideoReview" component={ParentVideoReviewScreen} />
      <Stack.Screen name="SendToGuests" component={SendToGuestsScreen} />
      <Stack.Screen name="SendSuccess" component={SendSuccessScreen} />
      <Stack.Screen name="FrameCreation" component={FrameCreationScreen} />
      <Stack.Screen name="PrivacyDashboard" component={PrivacyDashboardScreen} />
    </Stack.Navigator>
  );
};

// Welcome Screen - Simple auth choice that fits on one screen
const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        {/* Logo & Branding */}
        <Image
          source={require('../assets/icon.png')}
          style={{
            width: 120,
            height: 120,
            marginBottom: 16,
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: 36,
            fontWeight: '700',
            color: '#1e293b',
            letterSpacing: -0.5,
            marginBottom: 8,
          }}
        >
          ShowThx
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: '#06b6d4',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 48,
          }}
        >
          #REELYGRATEFUL
        </Text>

        {/* Auth Buttons */}
        <View style={{ width: '100%', gap: 16 }}>
          {/* I'm a Parent */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ParentLogin')}
            style={{
              backgroundColor: '#06b6d4',
              flexDirection: 'row',
              paddingVertical: 18,
              paddingHorizontal: 24,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="person" size={22} color="white" style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#ffffff' }}>
              I'm a Parent
            </Text>
          </TouchableOpacity>

          {/* I'm a Kid */}
          <TouchableOpacity
            onPress={() => navigation.navigate('KidPINLogin')}
            style={{
              backgroundColor: '#8B5CF6',
              flexDirection: 'row',
              paddingVertical: 18,
              paddingHorizontal: 24,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="happy" size={22} color="white" style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#ffffff' }}>
              I'm a Kid
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ParentSignup')}
          style={{ marginTop: 32, paddingVertical: 12 }}
        >
          <Text style={{ fontSize: 15, color: '#64748b' }}>
            New here?{' '}
            <Text style={{ color: '#f97316', fontWeight: '600' }}>Create Account</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={{ paddingBottom: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>
          COPPA Compliant • Parent Approved
        </Text>
      </View>
    </SafeAreaView>
  );
};

// Kid App Stack (logged in)
const KidAppStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="KidPendingGifts" component={KidPendingGiftsScreen} />
      <Stack.Screen name="FrameDecoration" component={FrameDecorationScreen} />
      <Stack.Screen name="VideoRecording" component={VideoRecordingScreen} />
      <Stack.Screen name="VideoPlayback" component={VideoPlaybackScreen} />
      <Stack.Screen name="FrameSelection" component={FrameSelectionScreen} />
      <Stack.Screen name="VideoCustomization" component={VideoCustomizationScreen} />
      <Stack.Screen name="VideoConfirmation" component={VideoConfirmationScreen} />
      <Stack.Screen name="VideoSuccess" component={VideoSuccessScreen} />
    </Stack.Navigator>
  );
};

// Root Navigator
export const RootNavigator = () => {
  const { edition, theme } = useEdition();
  const [parentSession, setParentSession] = useState(null);
  const [kidSession, setKidSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  const loadSessions = async () => {
    try {
      // Check for parent session
      const parentSessionId = await AsyncStorage.getItem('parentSessionId');
      setParentSession(parentSessionId || null);

      // COPPA Compliance: Run automatic data cleanup when parent logs in
      if (parentSessionId) {
        // Run cleanup in background (non-blocking)
        scheduleAutomaticCleanup(parentSessionId).catch(error => {
          console.log('[RETENTION] Background cleanup failed (non-blocking):', error.message);
        });

        // Register for push notifications (non-blocking)
        registerForPushNotifications().catch(error => {
          console.log('[NOTIFICATIONS] Push registration failed (non-blocking):', error.message);
        });
      }

      // Check for kid session
      const kidSessionId = await AsyncStorage.getItem('kidSessionId');
      setKidSession(kidSessionId || null);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppStateChange = async (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground - silently reload sessions without showing splash
      // This prevents session state loss while avoiding disruptive splash screen
      try {
        const parentSessionId = await AsyncStorage.getItem('parentSessionId');
        setParentSession(parentSessionId || null);

        const kidSessionId = await AsyncStorage.getItem('kidSessionId');
        setKidSession(kidSessionId || null);
      } catch (error) {
        console.error('Error reloading sessions after backgrounding:', error);
      }
    }
    appState.current = nextAppState;
  };

  useEffect(() => {
    // Load sessions on mount
    loadSessions();

    // Monitor app state changes (foreground/background)
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Poll for session changes every 2 seconds (reduced from 500ms to prevent race conditions)
    const pollInterval = setInterval(() => {
      if (appState.current === 'active') {
        loadSessions();
      }
    }, 2000);

    return () => {
      subscription.remove();
      clearInterval(pollInterval);
    };
  }, []);

  // Handle deep links for email confirmation
  useEffect(() => {
    // Handle incoming deep links
    const handleDeepLink = async (event) => {
      const url = event.url;
      console.log('📱 Deep link received:', url);

      // Check if this is an auth callback
      if (url.includes('auth-callback') || url.includes('access_token') || url.includes('refresh_token')) {
        try {
          // Extract tokens from URL
          const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '');
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            // Set the session with the tokens
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('❌ Error setting session:', error);
              Alert.alert('Error', 'Failed to confirm email. Please try again.');
            } else if (data?.user) {
              console.log('✅ Email confirmed, user authenticated:', data.user.email);

              // Store session
              await AsyncStorage.setItem('parentSessionId', data.user.id);
              setParentSession(data.user.id);

              Alert.alert(
                'Email Confirmed!',
                'Your email has been verified. Welcome to ShowThx!',
                [{ text: 'OK' }]
              );
            }
          }
        } catch (error) {
          console.error('❌ Deep link handling error:', error);
        }
      }
    };

    // Listen for incoming links
    const linkSubscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL (app was opened via link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      linkSubscription.remove();
    };
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Image
          source={require('../assets/icon.png')}
          style={{
            width: 140,
            height: 140,
            marginBottom: 24,
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: 42,
            fontWeight: '700',
            color: '#1e293b',
            letterSpacing: -0.5,
            marginBottom: 12,
          }}
        >
          ShowThx
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: '#06b6d4',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          #REELYTHANKFUL
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {parentSession ? (
        // Parent is logged in
        <ParentAppStack />
      ) : kidSession ? (
        // Kid is logged in
        <KidAppStack />
      ) : (
        // No session - show welcome screen with auth choices
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="ParentLogin" component={ParentLoginScreen} />
          <Stack.Screen name="ParentSignup" component={ParentSignupScreen} />
          <Stack.Screen name="KidPINLogin" component={KidPINLoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
