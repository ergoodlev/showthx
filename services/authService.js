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
 * COPPA Compliant: Records consent timestamps for audit trail
 * @param {string} email - Parent's email address
 * @param {string} password - Password
 * @param {string} fullName - Parent's full name
 * @param {object} consentData - Optional consent data for COPPA compliance
 */
export const parentSignup = async (email, password, fullName, consentData = {}) => {
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

    if (!authData?.user?.id) {
      throw new Error('No user returned from signup');
    }

    // Sign in the user to establish session (required for RLS policy)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;

    // Prepare consent timestamps for COPPA compliance
    const consentTimestamp = new Date().toISOString();

    // Now create parent profile with active session AND consent data
    const { error: profileError } = await supabase
      .from('parents')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        created_at: consentTimestamp,
        // COPPA Compliance: Record consent
        parental_consent_given: true,
        consent_given_at: consentTimestamp,
        terms_accepted: true,
        terms_accepted_at: consentTimestamp,
      });

    if (profileError) throw profileError;

    // Log consent to parental_consents table if it exists (for detailed audit trail)
    try {
      await supabase
        .from('parental_consents')
        .insert({
          parent_id: authData.user.id,
          consent_type: 'initial_signup',
          given: true,
          consent_text: 'Terms of Service, Privacy Policy, and COPPA Compliance Notice accepted at signup',
          method: 'in_app',
          created_at: consentTimestamp,
        });
    } catch (consentLogError) {
      // Don't fail signup if consent logging fails - table might not exist yet
      console.log('Note: Could not log to parental_consents table (may not exist):', consentLogError.message);
    }

    // Store session
    await AsyncStorage.setItem(SESSION_KEY, authData.user.id);

    return {
      success: true,
      userId: authData.user.id,
      email: authData.user.email,
      consentRecorded: true,
      consentTimestamp,
    };
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
 * Restore parent session (for biometric login)
 * Checks if there's a valid stored session and refreshes it
 */
export const restoreParentSession = async () => {
  try {
    // Check if there's a stored session ID
    const sessionId = await AsyncStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      return { success: false, error: 'No stored session' };
    }

    // Check if we have an active Supabase session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (session) {
      // Session is still valid
      return {
        success: true,
        userId: session.user.id,
        email: session.user.email,
      };
    }

    // Try to refresh the session
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshedSession) {
      return {
        success: true,
        userId: refreshedSession.user.id,
        email: refreshedSession.user.email,
      };
    }

    // Session couldn't be restored
    return { success: false, error: 'Session expired' };
  } catch (error) {
    console.error('Restore session error:', error);
    return { success: false, error: error.message };
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
 * Validate kid access code and login
 * Access code is unique per child (e.g., "ALI5821")
 * Prevents PIN collision at scale
 */
export const validateKidPin = async (accessCode) => {
  try {
    const upperCode = accessCode.toUpperCase();
    console.log('🔐 Attempting login with access code:', upperCode);

    // First, let's check ALL children to see what access codes exist
    const { data: allChildren, error: allError } = await supabase
      .from('children')
      .select('id, name, access_code');

    console.log('📊 All children in database:', allChildren);

    // Find child with this access code (use limit instead of single to avoid error on 0 rows)
    const { data: children, error: queryError } = await supabase
      .from('children')
      .select('id, parent_id, name, access_code')
      .eq('access_code', upperCode)
      .limit(1);

    console.log('🔍 Query result for code "' + upperCode + '":', { children, queryError });

    if (queryError) {
      console.error('❌ Query error:', queryError);
      return {
        success: false,
        error: 'Database error: ' + queryError.message,
      };
    }

    if (!children || children.length === 0) {
      console.error('❌ No child found with code:', upperCode);
      const existingCodes = allChildren?.map(c => ({ name: c.name, code: c.access_code })) || [];
      console.log('💡 Existing access codes in database:', existingCodes);
      return {
        success: false,
        error: 'Invalid Login Code - No child found. Check the code is correct.',
      };
    }

    const child = children[0];
    console.log('✅ Child found:', child.name, 'with code:', child.access_code);

    // Store kid session
    // IMPORTANT: kidSessionId must be the childId, not the access code
    await AsyncStorage.setItem(KID_SESSION_KEY, child.id);
    await AsyncStorage.setItem('kidName', child.name);
    await AsyncStorage.setItem('parentId', child.parent_id);
    await AsyncStorage.setItem('childId', child.id);

    return {
      success: true,
      parentId: child.parent_id,
      childId: child.id,
      childName: child.name,
    };
  } catch (error) {
    console.error('💥 Access code validation exception:', error);
    return {
      success: false,
      error: 'Error: ' + error.message,
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
    const childId = await AsyncStorage.getItem('childId');
    const childName = await AsyncStorage.getItem('childName');
    return { pin, parentId, childId, childName };
  } catch (error) {
    return { pin: null, parentId: null, childId: null, childName: null };
  }
};

/**
 * Kid logout
 */
export const kidLogout = async () => {
  try {
    await AsyncStorage.removeItem(KID_SESSION_KEY);
    await AsyncStorage.removeItem('parentId');
    await AsyncStorage.removeItem('childId');
    await AsyncStorage.removeItem('childName');
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
  restoreParentSession,
  parentLogout,
  getOrCreateKidCode,
  validateKidPin,
  getKidSession,
  kidLogout,
  validateParentSession,
};
