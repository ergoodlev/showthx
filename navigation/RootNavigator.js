/**
 * RootNavigator
 * Main navigation structure connecting parent and kid flows
 */

import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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

// Screen imports - Kid flows
import KidPINLoginScreen from '../screens/KidPINLoginScreen';
import KidPendingGiftsScreen from '../screens/KidPendingGiftsScreen';
import { VideoRecordingScreen } from '../screens/VideoRecordingScreen';
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
    try {
      // Check for parent session
      const parentSessionId = await AsyncStorage.getItem('parentSessionId');
      setParentSession(parentSessionId || null);

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

// Auth Choice Screen - Let user choose parent or kid login
const AuthChoiceScreen = ({ navigation }) => {
  const { theme, isKidsEdition } = useEdition();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.neutralColors.white,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <View style={{ marginBottom: theme.spacing.xl }}>
        <Ionicons
          name="gift"
          size={60}
          color={theme.brandColors.coral}
          style={{ textAlign: 'center', marginBottom: theme.spacing.md }}
        />
        <Text
          style={{
            fontSize: isKidsEdition ? 28 : 24,
            fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
            color: theme.neutralColors.charcoal,
            textAlign: 'center',
            marginBottom: theme.spacing.md,
          }}
        >
          Welcome to ThankCast
        </Text>
        <Text
          style={{
            fontSize: isKidsEdition ? 14 : 12,
            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            color: theme.neutralColors.gray,
            textAlign: 'center',
          }}
        >
          Create and share thank you videos
        </Text>
      </View>

      <View style={{ gap: theme.spacing.md, width: '100%', marginBottom: theme.spacing.lg }}>
        <TouchableOpacity
          onPress={() => navigation?.navigate('ParentAuth', { screen: 'ParentLogin' })}
          style={{
            backgroundColor: theme.brandColors.coral,
            paddingVertical: theme.spacing.lg,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="person" size={24} color="#FFFFFF" />
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: '#FFFFFF',
              marginTop: theme.spacing.sm,
            }}
          >
            I'm a Parent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation?.navigate('KidAuth', { screen: 'KidPINLogin' })}
          style={{
            backgroundColor: theme.brandColors.teal,
            paddingVertical: theme.spacing.lg,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="person-outline" size={24} color="#FFFFFF" />
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: '#FFFFFF',
              marginTop: theme.spacing.sm,
            }}
          >
            I'm a Child
          </Text>
        </TouchableOpacity>
      </View>

      <Text
        style={{
          fontSize: isKidsEdition ? 11 : 10,
          fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
          color: theme.neutralColors.gray,
          textAlign: 'center',
        }}
      >
        Select your role to continue
      </Text>
    </View>
  );
};

export default RootNavigator;
