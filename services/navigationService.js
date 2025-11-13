/**
 * Navigation Service
 * Helper functions for consistent navigation patterns across the app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';

/**
 * Logout and return to auth
 * Clears session and lets RootNavigator automatically switch to auth stack
 */
export const logoutAndReturnToAuth = async () => {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();

    // Clear all stored sessions
    await AsyncStorage.removeItem('parentSessionId');
    await AsyncStorage.removeItem('kidSessionId');
    await AsyncStorage.removeItem('parentEmail');
    await AsyncStorage.removeItem('kidName');

    // RootNavigator will automatically re-evaluate conditions
    // and switch to appropriate auth stack
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Handle unauthorized access
 * When a screen detects user is not logged in, go back
 */
export const handleUnauthorized = (navigation) => {
  navigation?.goBack();
};

/**
 * Safe navigation to nested screens
 * Use this pattern for navigating within the same stack
 */
export const safeNavigate = (navigation, screenName, params = {}) => {
  try {
    navigation?.navigate(screenName, params);
  } catch (error) {
    console.error(`Navigation to ${screenName} failed:`, error);
    // Fallback to going back
    navigation?.goBack();
  }
};
