/**
 * RootNavigator
 * Main navigation structure connecting parent and kid flows
 */

import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, AppState, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEdition } from '../context/EditionContext';

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

// Screen imports - Kid flows
import KidPINLoginScreen from '../screens/KidPINLoginScreen';
import KidPendingGiftsScreen from '../screens/KidPendingGiftsScreen';
import FrameDecorationScreen from '../screens/FrameDecorationScreen';
import VideoRecordingScreen from '../screens/VideoRecordingScreen';
import VideoPlaybackScreen from '../screens/VideoPlaybackScreen';
import MusicSelectionScreen from '../screens/MusicSelectionScreen';
import VideoCustomizationScreen from '../screens/VideoCustomizationScreen';
import VideoConfirmationScreen from '../screens/VideoConfirmationScreen';
import VideoSuccessScreen from '../screens/VideoSuccessScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Parent Auth Stack
const ParentAuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ParentSignup" component={ParentSignupScreen} />
      <Stack.Screen name="ParentLogin" component={ParentLoginScreen} />
    </Stack.Navigator>
  );
};

// Parent App Stack
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
    </Stack.Navigator>
  );
};

// Kid Auth Stack
const KidAuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="KidPINLogin" component={KidPINLoginScreen} />
    </Stack.Navigator>
  );
};

// Kid App Stack
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
      <Stack.Screen name="MusicSelection" component={MusicSelectionScreen} />
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
    const startTime = Date.now();
    const MIN_SPLASH_DURATION = 4500; // 4.5 seconds minimum

    try {
      // Check for parent session
      const parentSessionId = await AsyncStorage.getItem('parentSessionId');
      setParentSession(parentSessionId || null);

      // Check for kid session
      const kidSessionId = await AsyncStorage.getItem('kidSessionId');
      setKidSession(kidSessionId || null);

      // Ensure splash screen shows for at least MIN_SPLASH_DURATION
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_SPLASH_DURATION - elapsedTime);

      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppStateChange = async (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground - reload sessions
      await loadSessions();
    }
    appState.current = nextAppState;
  };

  useEffect(() => {
    // Load sessions on mount
    loadSessions();

    // Monitor app state changes (foreground/background)
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Poll for session changes every 500ms (helps detect login/logout immediately)
    const pollInterval = setInterval(() => {
      if (appState.current === 'active') {
        loadSessions();
      }
    }, 500);

    return () => {
      subscription.remove();
      clearInterval(pollInterval);
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.neutralColors.white }}>
        <ActivityIndicator size="large" color={theme.brandColors.coral} />
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
        // No session - show auth screens
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="AuthChoice"
            component={AuthChoiceScreen}
          />
          <Stack.Screen name="ParentAuth" component={ParentAuthStack} />
          <Stack.Screen name="KidAuth" component={KidAuthStack} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

// Auth Choice Screen - ShowThx branded welcome (native splash handles initial display)
const AuthChoiceScreen = ({ navigation }) => {
  const { theme, isKidsEdition } = useEdition();
  const [attemptingBiometric, setAttemptingBiometric] = React.useState(false);
  const [biometricChecked, setBiometricChecked] = React.useState(false);

  React.useEffect(() => {
    // Attempt biometric login on startup
    checkBiometricLogin();
  }, []);

  const checkBiometricLogin = async () => {
    try {
      const { isBiometricLoginEnabled, attemptBiometricLogin } = require('../services/biometricService');
      const { parentLogin, restoreParentSession } = require('../services/authService');

      const isEnabled = await isBiometricLoginEnabled();
      if (!isEnabled) {
        setBiometricChecked(true);
        return;
      }

      setAttemptingBiometric(true);
      const result = await attemptBiometricLogin();

      if (result.success) {
        if (result.hasCredentials && result.email && result.password) {
          // Use stored credentials for full re-authentication
          console.log('🔐 Using stored credentials for login...');
          const loginResult = await parentLogin(result.email, result.password);
          if (loginResult.success) {
            console.log('✅ Biometric login with credentials successful');
            // Session will be detected by RootNavigator polling
          } else {
            console.log('❌ Credential login failed:', loginResult.error);
          }
        } else {
          // Try session restore as fallback
          const sessionResult = await restoreParentSession();
          if (sessionResult.success) {
            console.log('✅ Biometric session restore successful');
          } else {
            console.log('⚠️ Session expired - credentials not stored');
          }
        }
      }
    } catch (error) {
      console.log('Biometric auto-login skipped:', error.message);
    } finally {
      setAttemptingBiometric(false);
      setBiometricChecked(true);
    }
  };

  // Show loading indicator while attempting biometric auth
  if (attemptingBiometric) {
    return (
      <LinearGradient
        colors={['#1e293b', '#0f172a', '#000000']}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <LinearGradient
          colors={['#06b6d4', '#0891b2']}
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
            shadowColor: '#06b6d4',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
          }}
        >
          <Ionicons name="videocam" size={44} color="white" />
        </LinearGradient>
        <ActivityIndicator size="small" color="#06b6d4" style={{ marginTop: 20 }} />
        <Text style={{ color: '#64748b', marginTop: 12, fontSize: 14 }}>
          Authenticating...
        </Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1e293b', '#0f172a', '#000000']}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
      }}
    >
      {/* Logo Section */}
      <View style={{ alignItems: 'center', marginBottom: 48 }}>
        <LinearGradient
          colors={['#06b6d4', '#0891b2']}
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
            shadowColor: '#06b6d4',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
          }}
        >
          <Ionicons name="videocam" size={44} color="white" />
        </LinearGradient>
        <Text
          style={{
            fontSize: 36,
            fontWeight: '700',
            color: '#ffffff',
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
          }}
        >
          #REELYTHANKFUL
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: '#94a3b8',
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          Create heartfelt thank you videos
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={{ width: '100%', gap: 16 }}>
        <TouchableOpacity
          onPress={() => navigation?.navigate('ParentAuth', { screen: 'ParentLogin' })}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['#06b6d4', '#0891b2']}
            style={{
              flexDirection: 'row',
              paddingVertical: 18,
              paddingHorizontal: 24,
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Ionicons name="person" size={22} color="white" />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#ffffff',
              }}
            >
              I'm a Parent
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation?.navigate('KidAuth', { screen: 'KidPINLogin' })}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={{
              flexDirection: 'row',
              paddingVertical: 18,
              paddingHorizontal: 24,
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Ionicons name="happy" size={22} color="white" />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#ffffff',
              }}
            >
              I'm a Kid
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation?.navigate('ParentAuth', { screen: 'ParentSignup' })}
          style={{
            paddingVertical: 16,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14, color: '#94a3b8' }}>
            New here?{' '}
            <Text style={{ color: '#06b6d4', fontWeight: '600' }}>
              Create Account
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={{ position: 'absolute', bottom: 40 }}>
        <Text
          style={{
            fontSize: 11,
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          COPPA Compliant • Parent Approved
        </Text>
      </View>
    </LinearGradient>
  );
};

export default RootNavigator;
