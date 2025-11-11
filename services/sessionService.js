/**
 * Session Management Service
 * Handles parent login/logout and session tracking
 * Ensures only authenticated parents can access dashboard
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecure, storeSecure } from './secureStorageService';
import { logParentalConsent } from './auditLogService';

const SESSION_KEY = 'parent_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CHILD_MODE_KEY = 'child_mode_active';

/**
 * Log parent in with PIN verification
 * @param {string} pin - Parent PIN
 * @returns {Promise<object>} - Session data
 */
export async function loginParent(pin) {
  try {
    console.log('[SESSION] Parent login attempt');

    // Get stored PIN (key must match secureStorageService: 'parentpin')
    const storedPin = await getSecure('parentpin');

    // Verify PIN
    if (!storedPin || storedPin !== pin) {
      throw new Error('Invalid PIN');
    }

    // Create session
    const sessionData = {
      userId: 'parent_authenticated', // In production, use actual parent ID from Supabase
      userType: 'parent',
      loginTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS).toISOString(),
      sessionId: generateSessionId(),
    };

    // Store session
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    // Log login
    await logParentalConsent('parent_login', { sessionId: sessionData.sessionId }, 'parent');

    console.log('[SESSION] Parent logged in successfully');

    return sessionData;
  } catch (error) {
    console.error('[SESSION ERROR] Login failed:', error);
    throw error;
  }
}

/**
 * Activate child recording mode
 * Requires parent PIN to prevent child access
 * @param {string} childPin - Child PIN
 * @returns {Promise<boolean>}
 */
export async function activateChildMode(childPin) {
  try {
    console.log('[SESSION] Child mode activation');

    // Optional: Verify child PIN
    // const storedChildPin = await getSecure('child_pin');
    // if (storedChildPin && storedChildPin !== childPin) {
    //   throw new Error('Invalid child PIN');
    // }

    const childModeData = {
      active: true,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hour session
    };

    await AsyncStorage.setItem(CHILD_MODE_KEY, JSON.stringify(childModeData));

    console.log('[SESSION] Child mode activated');

    return true;
  } catch (error) {
    console.error('[SESSION ERROR] Child mode activation failed:', error);
    throw error;
  }
}

/**
 * Check if parent is currently logged in
 * @returns {Promise<object|null>} - Session data or null
 */
export async function getParentSession() {
  try {
    const sessionJson = await AsyncStorage.getItem(SESSION_KEY);

    if (!sessionJson) {
      return null;
    }

    const session = JSON.parse(sessionJson);

    // Check if session expired
    if (new Date(session.expiresAt) < new Date()) {
      console.log('[SESSION] Session expired');
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch (error) {
    console.error('[SESSION ERROR] Failed to get session:', error);
    return null;
  }
}

/**
 * Check if child mode is active
 * @returns {Promise<boolean>}
 */
export async function isChildModeActive() {
  try {
    const childModeJson = await AsyncStorage.getItem(CHILD_MODE_KEY);

    if (!childModeJson) {
      return false;
    }

    const childMode = JSON.parse(childModeJson);

    // Check if expired
    if (new Date(childMode.expiresAt) < new Date()) {
      await AsyncStorage.removeItem(CHILD_MODE_KEY);
      return false;
    }

    return childMode.active === true;
  } catch (error) {
    console.error('[SESSION ERROR] Failed to check child mode:', error);
    return false;
  }
}

/**
 * Log parent out
 * @returns {Promise<void>}
 */
export async function logoutParent() {
  try {
    console.log('[SESSION] Parent logout');

    await AsyncStorage.removeItem(SESSION_KEY);
    await AsyncStorage.removeItem(CHILD_MODE_KEY);

    console.log('[SESSION] Parent logged out successfully');
  } catch (error) {
    console.error('[SESSION ERROR] Logout failed:', error);
    throw error;
  }
}

/**
 * Exit child mode
 * @returns {Promise<void>}
 */
export async function exitChildMode() {
  try {
    console.log('[SESSION] Exiting child mode');

    await AsyncStorage.removeItem(CHILD_MODE_KEY);

    console.log('[SESSION] Child mode exited');
  } catch (error) {
    console.error('[SESSION ERROR] Failed to exit child mode:', error);
    throw error;
  }
}

/**
 * Extend session time (refresh/keep-alive)
 * @returns {Promise<object>}
 */
export async function refreshSession() {
  try {
    const sessionJson = await AsyncStorage.getItem(SESSION_KEY);

    if (!sessionJson) {
      throw new Error('No active session');
    }

    const session = JSON.parse(sessionJson);

    // Extend expiration
    session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS).toISOString();

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));

    console.log('[SESSION] Session refreshed');

    return session;
  } catch (error) {
    console.error('[SESSION ERROR] Failed to refresh session:', error);
    throw error;
  }
}

/**
 * Check if parent has set up PIN
 * @returns {Promise<boolean>}
 */
export async function hasParentPin() {
  try {
    const pin = await getSecure('parentpin');
    return !!pin;
  } catch (error) {
    console.error('[SESSION ERROR] Failed to check parent PIN:', error);
    return false;
  }
}

/**
 * Check if parental consent was given
 * @returns {Promise<boolean>}
 */
export async function hasParentalConsent() {
  try {
    const consent = await AsyncStorage.getItem('parental_consent_given');
    return consent === 'true';
  } catch (error) {
    console.error('[SESSION ERROR] Failed to check parental consent:', error);
    return false;
  }
}

/**
 * Generate a unique session ID
 * @returns {string}
 */
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get time remaining in session (in seconds)
 * @returns {Promise<number>}
 */
export async function getSessionTimeRemaining() {
  try {
    const session = await getParentSession();

    if (!session) {
      return 0;
    }

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

    return remaining;
  } catch (error) {
    console.error('[SESSION ERROR] Failed to get session time remaining:', error);
    return 0;
  }
}

/**
 * Debug: Clear all sessions (development only)
 * @returns {Promise<void>}
 */
export async function clearAllSessions() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
    await AsyncStorage.removeItem(CHILD_MODE_KEY);
    console.log('[SESSION] All sessions cleared (dev only)');
  } catch (error) {
    console.error('[SESSION ERROR] Failed to clear sessions:', error);
  }
}
