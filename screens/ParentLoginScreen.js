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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEdition } from '../context/EditionContext';
import { TextField } from '../components/TextField';
import { ThankCastButton } from '../components/ThankCastButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { parentLogin } from '../services/authService';

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

  // Load saved email on mount
  useEffect(() => {
    loadSavedEmail();
  }, []);

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

      // Navigate to parent dashboard
      navigation?.replace('ParentDashboard');
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
                  marginBottom: theme.spacing.sm,
                },
              ]}
            >
              Welcome Back
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
            <TouchableOpacity onPress={() => navigation?.navigate('ForgotPassword')}>
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
