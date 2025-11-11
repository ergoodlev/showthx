/**
 * Auth Service
 * Handles parent and kid authentication via Supabase
 */

import { supabase } from '../supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'parentSessionId';
const KID_SESSION_KEY = 'kidSessionId';

// ===== PARENT AUTHENTICATION =====

/**
 * Parent signup with email and password
 */
export const parentSignup = async (email, password, fullName) => {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) throw authError;

    // Create parent profile
    if (authData?.user?.id) {
      const { error: profileError } = await supabase
        .from('parents')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          created_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // Store session
      await AsyncStorage.setItem(SESSION_KEY, authData.user.id);

      return {
        success: true,
        userId: authData.user.id,
        email: authData.user.email,
      };
    }

    throw new Error('No user returned from signup');
  } catch (error) {
    console.error('Signup error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Parent login with email and password
 */
export const parentLogin = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data?.user?.id) {
      // Store session
      await AsyncStorage.setItem(SESSION_KEY, data.user.id);

      return {
        success: true,
        userId: data.user.id,
        email: data.user.email,
      };
    }

    throw new Error('No user returned from login');
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get parent session
 */
export const getParentSession = async () => {
  try {
    const sessionId = await AsyncStorage.getItem(SESSION_KEY);
    return sessionId ? { sessionId } : { sessionId: null };
  } catch (error) {
    return { sessionId: null };
  }
};

/**
 * Parent logout
 */
export const parentLogout = async () => {
  try {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(SESSION_KEY);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

// ===== KID AUTHENTICATION =====

/**
 * Get or create kid code for parent
 */
export const getOrCreateKidCode = async (parentId) => {
  try {
    // Check if parent already has a kid code
    const { data: existing } = await supabase
      .from('parents')
      .select('kid_code')
      .eq('id', parentId)
      .single();

    if (existing?.kid_code) {
      return { code: existing.kid_code, error: null };
    }

    // Generate new 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Store in database
    const { error } = await supabase
      .from('parents')
      .update({ kid_code: code })
      .eq('id', parentId);

    if (error) throw error;

    return { code, error: null };
  } catch (error) {
    console.error('Error creating kid code:', error);
    return { code: null, error: error.message };
  }
};

/**
 * Validate kid PIN and login
 */
export const validateKidPin = async (pin) => {
  try {
    // Find parent with this PIN
    const { data: parent, error } = await supabase
      .from('parents')
      .select('id, full_name, child_name')
      .eq('kid_code', pin)
      .single();

    if (error || !parent) {
      return {
        success: false,
        error: 'Invalid PIN',
      };
    }

    // Store kid session
    await AsyncStorage.setItem(KID_SESSION_KEY, pin);
    await AsyncStorage.setItem('parentId', parent.id);

    return {
      success: true,
      parentId: parent.id,
      childName: parent.child_name || 'Child',
    };
  } catch (error) {
    console.error('PIN validation error:', error);
    return {
      success: false,
      error: 'Unable to validate PIN',
    };
  }
};

/**
 * Get kid session
 */
export const getKidSession = async () => {
  try {
    const pin = await AsyncStorage.getItem(KID_SESSION_KEY);
    const parentId = await AsyncStorage.getItem('parentId');
    return { pin, parentId };
  } catch (error) {
    return { pin: null, parentId: null };
  }
};

/**
 * Kid logout
 */
export const kidLogout = async () => {
  try {
    await AsyncStorage.removeItem(KID_SESSION_KEY);
    await AsyncStorage.removeItem('parentId');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if parent session is valid
 */
export const validateParentSession = async (sessionId) => {
  try {
    const { data, error } = await supabase
      .from('parents')
      .select('id')
      .eq('id', sessionId)
      .single();

    return {
      valid: !!data && !error,
      error: error?.message || null,
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

export default {
  parentSignup,
  parentLogin,
  getParentSession,
  parentLogout,
  getOrCreateKidCode,
  validateKidPin,
  getKidSession,
  kidLogout,
  validateParentSession,
};
