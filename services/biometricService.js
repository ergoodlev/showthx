/**
 * Biometric Authentication Service
 * Handles Face ID / Touch ID authentication on iOS
 * Uses SecureStore for encrypted credential storage
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = 'biometricEnabled';
const BIOMETRIC_USER_KEY = 'biometricUserId';
const SECURE_EMAIL_KEY = 'biometric_email';
const SECURE_PASSWORD_KEY = 'biometric_password';

/**
 * Check if device supports biometric authentication
 */
export const isBiometricSupported = async () => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    return compatible;
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return false;
  }
};

/**
 * Check if biometrics are enrolled (user has Face ID or Touch ID set up)
 */
export const isBiometricEnrolled = async () => {
  try {
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch (error) {
    console.error('Error checking biometric enrollment:', error);
    return false;
  }
};

/**
 * Get available biometric types on device
 * Returns: FINGERPRINT, FACIAL_RECOGNITION, IRIS, or empty array
 */
export const getBiometricTypes = async () => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types;
  } catch (error) {
    console.error('Error getting biometric types:', error);
    return [];
  }
};

/**
 * Get human-readable biometric type name
 */
export const getBiometricTypeName = async () => {
  const types = await getBiometricTypes();

  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Touch ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris Scan';
  }

  return 'Biometric';
};

/**
 * Authenticate using biometrics
 * @param {string} promptMessage - Message to display to user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const authenticateWithBiometrics = async (promptMessage = 'Authenticate to continue') => {
  try {
    // Check if device supports biometrics
    const isSupported = await isBiometricSupported();
    if (!isSupported) {
      return {
        success: false,
        error: 'Biometric authentication is not supported on this device',
      };
    }

    // Check if biometrics are enrolled
    const isEnrolled = await isBiometricEnrolled();
    if (!isEnrolled) {
      return {
        success: false,
        error: 'No biometric credentials enrolled. Please set up Face ID or Touch ID in Settings.',
      };
    }

    // Attempt authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow passcode as fallback
    });

    if (result.success) {
      console.log('Biometric authentication successful');
      return { success: true };
    } else {
      console.log('Biometric authentication failed:', result.error);
      return {
        success: false,
        error: result.error === 'user_cancel'
          ? 'Authentication cancelled'
          : 'Authentication failed. Please try again.',
      };
    }
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: 'An error occurred during authentication. Please try again.',
    };
  }
};

/**
 * Check if user has enabled biometric login
 */
export const isBiometricLoginEnabled = async () => {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric login status:', error);
    return false;
  }
};

/**
 * Enable biometric login for a user
 * @param {string} userId - User ID to associate with biometric login
 * @param {string} email - User's email for re-authentication
 * @param {string} password - User's password for re-authentication
 */
export const enableBiometricLogin = async (userId, email = null, password = null) => {
  try {
    // First authenticate to confirm identity
    const biometricName = await getBiometricTypeName();
    const authResult = await authenticateWithBiometrics(
      `Authenticate with ${biometricName} to enable quick login`
    );

    if (!authResult.success) {
      return authResult;
    }

    // Store the preference
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    await AsyncStorage.setItem(BIOMETRIC_USER_KEY, userId);

    // Securely store credentials for re-authentication
    if (email && password) {
      await SecureStore.setItemAsync(SECURE_EMAIL_KEY, email);
      await SecureStore.setItemAsync(SECURE_PASSWORD_KEY, password);
      console.log('✅ Biometric login enabled with secure credential storage');
    } else {
      console.log('⚠️ Biometric enabled without credentials - session restore only');
    }

    return { success: true };
  } catch (error) {
    console.error('Error enabling biometric login:', error);
    return { success: false, error: 'Failed to enable biometric login' };
  }
};

/**
 * Disable biometric login
 */
export const disableBiometricLogin = async () => {
  try {
    await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    await AsyncStorage.removeItem(BIOMETRIC_USER_KEY);
    // Clear secure credentials
    await SecureStore.deleteItemAsync(SECURE_EMAIL_KEY);
    await SecureStore.deleteItemAsync(SECURE_PASSWORD_KEY);
    console.log('Biometric login disabled and credentials cleared');
    return { success: true };
  } catch (error) {
    console.error('Error disabling biometric login:', error);
    return { success: false, error: 'Failed to disable biometric login' };
  }
};

/**
 * Get stored credentials for biometric login
 * @returns {Promise<{email: string, password: string} | null>}
 */
export const getStoredCredentials = async () => {
  try {
    const email = await SecureStore.getItemAsync(SECURE_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(SECURE_PASSWORD_KEY);
    if (email && password) {
      return { email, password };
    }
    return null;
  } catch (error) {
    console.error('Error getting stored credentials:', error);
    return null;
  }
};

/**
 * Get the user ID associated with biometric login
 */
export const getBiometricUserId = async () => {
  try {
    const userId = await AsyncStorage.getItem(BIOMETRIC_USER_KEY);
    return userId;
  } catch (error) {
    console.error('Error getting biometric user ID:', error);
    return null;
  }
};

/**
 * Attempt biometric login
 * Returns credentials if available, or just userId for session restore
 */
export const attemptBiometricLogin = async () => {
  try {
    // Check if biometric login is enabled
    const isEnabled = await isBiometricLoginEnabled();
    if (!isEnabled) {
      return { success: false, error: 'Biometric login is not enabled' };
    }

    // Get stored user ID
    const userId = await getBiometricUserId();
    if (!userId) {
      return { success: false, error: 'No user associated with biometric login' };
    }

    // Authenticate with biometrics
    const biometricName = await getBiometricTypeName();
    const authResult = await authenticateWithBiometrics(
      `Sign in with ${biometricName}`
    );

    if (!authResult.success) {
      return authResult;
    }

    // Get stored credentials for full re-authentication
    const credentials = await getStoredCredentials();

    if (credentials) {
      console.log('✅ Biometric auth successful - credentials available for login');
      return {
        success: true,
        userId,
        email: credentials.email,
        password: credentials.password,
        hasCredentials: true
      };
    }

    // No credentials stored - can only try session restore
    console.log('⚠️ Biometric auth successful but no credentials stored');
    return { success: true, userId, hasCredentials: false };
  } catch (error) {
    console.error('Biometric login attempt error:', error);
    return { success: false, error: 'Biometric login failed' };
  }
};

export default {
  isBiometricSupported,
  isBiometricEnrolled,
  getBiometricTypes,
  getBiometricTypeName,
  authenticateWithBiometrics,
  isBiometricLoginEnabled,
  enableBiometricLogin,
  disableBiometricLogin,
  getBiometricUserId,
  getStoredCredentials,
  attemptBiometricLogin,
};
