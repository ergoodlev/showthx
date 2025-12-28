/**
 * ParentLoginScreen
 * Parent login with email and password
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEdition } from '../context/EditionContext';
import { TextField } from '../components/TextField';
import { ThankCastButton } from '../components/ThankCastButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { parentLogin, restoreParentSession, requestPasswordReset, signInWithApple } from '../services/authService';
import {
  isBiometricSupported,
  isBiometricLoginEnabled,
  getBiometricTypeName,
  attemptBiometricLogin,
  enableBiometricLogin,
  getStoredCredentials,
} from '../services/biometricService';

export const ParentLoginScreen = ({ navigation }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricName, setBiometricName] = useState('Face ID');

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Apple Sign In state
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  // Load saved email and check biometric/Apple availability on mount
  useEffect(() => {
    loadSavedEmail();
    checkBiometricAvailability();
    checkAppleAuthAvailability();
    attemptAutoFaceID();
  }, []);

  // Auto-trigger Face ID if credentials are stored
  const attemptAutoFaceID = async () => {
    try {
      const isSupported = await isBiometricSupported();
      const isEnabled = await isBiometricLoginEnabled();
      const storedCredentials = await getStoredCredentials();
      const hasCredentials = storedCredentials?.email && storedCredentials?.password;

      console.log('🔐 Auto Face ID check:', { isSupported, isEnabled, hasCredentials });

      // Pre-fill email from stored credentials if available
      if (hasCredentials && storedCredentials.email) {
        setEmail(storedCredentials.email);
        setRememberMe(true);
      }

      if (isSupported && isEnabled && hasCredentials) {
        console.log('📱 Auto-triggering Face ID login...');
        // Small delay to let the screen fully render
        await new Promise(resolve => setTimeout(resolve, 500));
        handleBiometricLogin();
      }
    } catch (error) {
      console.log('⚠️ Auto Face ID check failed (non-blocking):', error.message);
    }
  };

  const checkAppleAuthAvailability = async () => {
    if (Platform.OS === 'ios') {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setAppleAuthAvailable(isAvailable);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const isSupported = await isBiometricSupported();

      // Show biometric button if supported, regardless of whether it's enabled
      if (isSupported) {
        setBiometricAvailable(true);
        const name = await getBiometricTypeName();
        setBiometricName(name);
        console.log(`📱 ${name} is available`);
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  // Handle biometric login
  const handleBiometricLogin = async () => {
    setError(null);

    try {
      setLoading(true);

      // Check if biometric login is enabled
      const isEnabled = await isBiometricLoginEnabled();

      if (!isEnabled) {
        // First time using biometric - need to log in with email/password first
        setError(`${biometricName} is not set up yet. Please log in with email and password, then you'll be prompted to enable ${biometricName}.`);
        setLoading(false);
        return;
      }

      const result = await attemptBiometricLogin();

      if (!result.success) {
        if (result.error !== 'Authentication cancelled') {
          setError(result.error);
        }
        return;
      }

      // If credentials are available, use them for full re-authentication
      if (result.hasCredentials && result.email && result.password) {
        console.log('🔐 Biometric login with stored credentials - performing full login');
        const loginResult = await parentLogin(result.email, result.password);

        if (!loginResult.success) {
          // Credentials may have changed - prompt user to log in manually
          setError('Your password has changed. Please log in with your current password.');
          return;
        }

        console.log('✅ Biometric login successful with full authentication');
        // RootNavigator will detect session and switch to ParentAppStack
        return;
      }

      // Fallback: Try to restore session (less secure, may not work if session expired)
      console.log('⚠️ No stored credentials - attempting session restore');
      const sessionResult = await restoreParentSession();

      if (!sessionResult.success) {
        setError('Please log in with your email and password to continue.');
        return;
      }

      console.log('✅ Biometric login successful with session restore');
      // Wait a moment for RootNavigator to detect the session
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error('❌ Biometric login error:', err);
      setError('Biometric login failed. Please try again or use email/password.');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedEmail = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('parentEmail');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (err) {
      console.error('Error loading saved email:', err);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      setResetLoading(true);
      const result = await requestPasswordReset(resetEmail);

      if (result.success) {
        setShowForgotModal(false);
        setResetEmail('');
        Alert.alert(
          'Check Your Email',
          'If an account exists with that email, you will receive a password reset link shortly.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Apple Sign In
  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await signInWithApple();

      if (result.cancelled) {
        // User cancelled - do nothing
        return;
      }

      if (!result.success) {
        setError(result.error || 'Apple Sign In failed. Please try again.');
        return;
      }

      console.log('✅ Apple Sign In successful');
      // RootNavigator will detect session and switch to ParentAppStack
    } catch (err) {
      console.error('❌ Apple Sign In error:', err);
      setError('Apple Sign In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Validation
  const validateForm = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle login
  const handleLogin = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Use auth service for login
      const result = await parentLogin(email, password);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Save email if "Remember Me" is checked
      if (rememberMe) {
        await AsyncStorage.setItem('parentEmail', email);
      } else {
        await AsyncStorage.removeItem('parentEmail');
      }

      // Check if biometric is supported - always offer to save/update credentials
      const biometricSupported = await isBiometricSupported();
      const biometricEnabled = await isBiometricLoginEnabled();

      // Check if credentials are actually stored (they don't sync between devices)
      const storedCredentials = await getStoredCredentials();
      const hasCredentials = storedCredentials?.email && storedCredentials?.password;

      console.log('🔐 Biometric check:', { biometricSupported, biometricEnabled, hasCredentials });

      // Prompt to enable/re-enable if: not enabled yet, OR enabled but no credentials (new device)
      if (biometricSupported && (!biometricEnabled || !hasCredentials)) {
        const biometricType = await getBiometricTypeName();
        const isNewDevice = biometricEnabled && !hasCredentials;
        console.log(`📱 Showing ${biometricType} enrollment prompt (new device: ${isNewDevice})`);
        // Prompt user to enable biometric login immediately (no delay)
        // Show alert before RootNavigator's next polling cycle detects the session
        Alert.alert(
          isNewDevice ? `Set Up ${biometricType} on This Device` : `Enable ${biometricType}?`,
          isNewDevice
            ? `${biometricType} needs to be set up again on this new device. Save your login for faster sign-in?`
            : `Would you like to use ${biometricType} for faster sign-in next time?`,
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => console.log('User declined biometric setup'),
            },
            {
              text: 'Enable',
              onPress: async () => {
                try {
                  // Pass credentials for secure storage - enables true "remember me"
                  console.log(`🔐 Enabling ${biometricType}...`);
                  const enableResult = await enableBiometricLogin(result.userId, email, password);
                  if (enableResult.success) {
                    console.log(`✅ ${biometricType} enabled with secure credential storage`);
                    Alert.alert(
                      'Success!',
                      `${biometricType} has been enabled. You can now use it to sign in next time.`
                    );
                    // Refresh biometric availability
                    setBiometricAvailable(true);
                  } else {
                    console.error(`❌ Failed to enable ${biometricType}:`, enableResult.error);
                    Alert.alert(
                      'Setup Failed',
                      enableResult.error || `Could not enable ${biometricType}. You can try again from Settings.`
                    );
                  }
                } catch (err) {
                  console.error(`❌ Error enabling ${biometricType}:`, err);
                  Alert.alert(
                    'Setup Error',
                    `An error occurred while enabling ${biometricType}. Please try again.`
                  );
                }
              },
            },
          ]
        );
      }

      // Session is stored in AsyncStorage
      // RootNavigator will detect it via polling and switch to ParentAppStack
      console.log('✅ Login successful - RootNavigator will handle navigation');
    } catch (err) {
      console.error('Login error:', err);

      // User-friendly error messages
      if (
        err.message?.includes('Invalid login') ||
        err.message?.includes('incorrect') ||
        err.message?.includes('Invalid PIN')
      ) {
        setError('Invalid email or password. Please try again.');
      } else if (err.message?.includes('not confirmed')) {
        setError('Please confirm your email address before logging in.');
      } else {
        setError(err.message || 'An error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkboxSize = isKidsEdition ? 22 : 18;
  const fontSize = isKidsEdition ? 14 : 12;
  const paddingHorizontal = isKidsEdition ? theme.spacing.lg : theme.spacing.md;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.neutralColors.white }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, { marginBottom: theme.spacing.lg }]}>
            <Text
              style={[
                styles.title,
                {
                  fontSize: isKidsEdition ? 28 : 24,
                  color: theme.neutralColors.dark,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                  marginBottom: theme.spacing.xs,
                },
              ]}
            >
              Parent Login
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: isKidsEdition ? 16 : 14,
                  color: theme.neutralColors.mediumGray,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                },
              ]}
            >
              Sign in to your account
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={() => setError(null)}
              autoDismiss={false}
              style={{ marginBottom: theme.spacing.md }}
            />
          )}

          {/* Form Fields */}
          <TextField
            label="Email Address"
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            autoComplete="email"
            error={validationErrors.email}
            required
          />

          <TextField
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            showPasswordToggle
            autoCapitalize="none"
            textContentType="password"
            autoComplete="password"
            error={validationErrors.password}
            required
          />

          {/* Remember Me & Forgot Password */}
          <View
            style={[
              styles.optionsRow,
              {
                marginBottom: theme.spacing.lg,
              },
            ]}
          >
            {/* Remember Me */}
            <TouchableOpacity
              style={styles.rememberMeRow}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    width: checkboxSize,
                    height: checkboxSize,
                    borderRadius: checkboxSize / 4,
                    borderColor: theme.brandColors.coral,
                    backgroundColor: rememberMe
                      ? theme.brandColors.coral
                      : 'transparent',
                  },
                ]}
              >
                {rememberMe && (
                  <Ionicons
                    name="checkmark"
                    size={checkboxSize - 4}
                    color="#FFFFFF"
                  />
                )}
              </View>
              <Text
                style={[
                  {
                    fontSize,
                    color: theme.neutralColors.dark,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    marginLeft: theme.spacing.xs,
                  },
                ]}
              >
                Remember me
              </Text>
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity onPress={() => {
              setResetEmail(email); // Pre-fill with current email if available
              setShowForgotModal(true);
            }}>
              <Text
                style={[
                  {
                    fontSize,
                    color: theme.brandColors.coral,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  },
                ]}
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <ThankCastButton
            title="Log In"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={{ marginBottom: theme.spacing.md }}
          />

          {/* Biometric Login Button */}
          {biometricAvailable && (
            <TouchableOpacity
              onPress={handleBiometricLogin}
              disabled={loading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: theme.spacing.md,
                marginBottom: theme.spacing.md,
                borderWidth: 1.5,
                borderColor: theme.brandColors.teal,
                borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
                backgroundColor: 'transparent',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Ionicons
                name={biometricName === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                size={24}
                color={theme.brandColors.teal}
              />
              <Text
                style={{
                  marginLeft: theme.spacing.sm,
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.brandColors.teal,
                }}
              >
                Sign in with {biometricName}
              </Text>
            </TouchableOpacity>
          )}

          {/* Apple Sign In Button */}
          {appleAuthAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={isKidsEdition ? 12 : 8}
              style={{
                width: '100%',
                height: 50,
                marginBottom: theme.spacing.md,
                opacity: loading ? 0.6 : 1,
              }}
              onPress={handleAppleSignIn}
            />
          )}

          {/* Signup Link */}
          <View style={[styles.signupLinkContainer, { marginBottom: theme.spacing.lg }]}>
            <Text
              style={[
                {
                  fontSize,
                  color: theme.neutralColors.mediumGray,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                },
              ]}
            >
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation?.navigate('ParentSignup')}>
              <Text
                style={[
                  {
                    fontSize,
                    color: theme.brandColors.coral,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  },
                ]}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.neutralColors.lightGray,
            }}
          >
            <Text
              style={{
                fontSize: isKidsEdition ? 18 : 16,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                color: theme.neutralColors.dark,
              }}
            >
              Reset Password
            </Text>
            <TouchableOpacity onPress={() => setShowForgotModal(false)}>
              <Ionicons name="close" size={28} color={theme.neutralColors.dark} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: theme.spacing.lg }}>
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 13,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                marginBottom: theme.spacing.lg,
                lineHeight: 20,
              }}
            >
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <TextField
              label="Email Address"
              placeholder="your@email.com"
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              autoComplete="email"
            />

            <ThankCastButton
              title={resetLoading ? 'Sending...' : 'Send Reset Link'}
              onPress={handleForgotPassword}
              loading={resetLoading}
              disabled={resetLoading}
              style={{ marginTop: theme.spacing.md }}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Loading Overlay */}
      <LoadingSpinner
        visible={loading}
        message="Signing in..."
        fullScreen
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: '400',
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ParentLoginScreen;
