/**
 * Secure Storage Service
 * Stores sensitive tokens, PINs, and credentials using expo-secure-store
 * Never stores plaintext sensitive data
 */

import * as SecureStore from 'expo-secure-store';

const SECURE_KEYS = {
  SUPABASE_SESSION: 'supabase',
  PARENT_PIN: 'parentpin',
  PARENT_EMAIL: 'parentemail',
  ENCRYPTION_KEY: 'encryption',
  DEVICE_ID: 'deviceid',
};

/**
 * Store sensitive data securely
 * @param {string} key - Key identifier
 * @param {string} value - Value to store
 * @returns {Promise<void>}
 */
export async function storeSecure(key, value) {
  try {
    // Validate key is one of the allowed values or custom
    const allowedKeys = Object.values(SECURE_KEYS);
    if (!allowedKeys.includes(key) && !key.startsWith('custom')) {
      throw new Error(`Invalid secure key: ${key}`);
    }
    await SecureStore.setItemAsync(key, value);
    console.log(`[SECURITY] Stored secure value for key: ${key}`);
  } catch (error) {
    console.error(`[SECURITY ERROR] Failed to store secure value for ${key}:`, error);
    throw error;
  }
}

/**
 * Retrieve sensitive data securely
 * @param {string} key - Key identifier
 * @returns {Promise<string|null>}
 */
export async function getSecure(key) {
  try {
    const value = await SecureStore.getItemAsync(key);
    if (value) {
      console.log(`[SECURITY] Retrieved secure value for key: ${key}`);
    }
    return value;
  } catch (error) {
    console.error(`[SECURITY ERROR] Failed to retrieve secure value for ${key}:`, error);
    return null;
  }
}

/**
 * Remove sensitive data securely
 * @param {string} key - Key identifier
 * @returns {Promise<void>}
 */
export async function removeSecure(key) {
  try {
    await SecureStore.deleteItemAsync(key);
    console.log(`[SECURITY] Removed secure value for key: ${key}`);
  } catch (error) {
    console.error(`[SECURITY ERROR] Failed to remove secure value for ${key}:`, error);
    throw error;
  }
}

/**
 * Clear all sensitive data (right-to-be-forgotten)
 * @returns {Promise<void>}
 */
export async function clearAllSecure() {
  try {
    for (const key of Object.values(SECURE_KEYS)) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (e) {
        // Key might not exist, continue
      }
    }
    console.log('[SECURITY] Cleared all secure storage');
  } catch (error) {
    console.error('[SECURITY ERROR] Failed to clear secure storage:', error);
    throw error;
  }
}

/**
 * Store parent PIN securely
 * @param {string} pin - 4-6 digit PIN
 * @returns {Promise<void>}
 */
export async function storeParentPin(pin) {
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    throw new Error('PIN must be 4-6 digits');
  }
  await storeSecure(SECURE_KEYS.PARENT_PIN, pin);
}

/**
 * Verify parent PIN
 * @param {string} pin - PIN to verify
 * @returns {Promise<boolean>}
 */
export async function verifyParentPin(pin) {
  try {
    const storedPin = await getSecure(SECURE_KEYS.PARENT_PIN);
    return storedPin === pin;
  } catch (error) {
    console.error('[SECURITY ERROR] Failed to verify PIN:', error);
    return false;
  }
}

/**
 * Store parent email securely
 * @param {string} email - Parent email
 * @returns {Promise<void>}
 */
export async function storeParentEmail(email) {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email');
  }
  await storeSecure(SECURE_KEYS.PARENT_EMAIL, email);
}

/**
 * Get stored parent email
 * @returns {Promise<string|null>}
 */
export async function getParentEmail() {
  return getSecure(SECURE_KEYS.PARENT_EMAIL);
}

/**
 * Store encryption key securely (for optional E2E encryption)
 * @param {string} keyString - Encryption key as string
 * @returns {Promise<void>}
 */
export async function storeEncryptionKey(keyString) {
  await storeSecure(SECURE_KEYS.ENCRYPTION_KEY, keyString);
}

/**
 * Get encryption key
 * @returns {Promise<string|null>}
 */
export async function getEncryptionKey() {
  return getSecure(SECURE_KEYS.ENCRYPTION_KEY);
}
