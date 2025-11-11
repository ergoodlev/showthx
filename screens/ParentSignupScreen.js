/**
 * ParentSignupScreen
 * New parent account creation with email, password, and COPPA consent
 */

import React, { useState } from 'react';
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
import { useEdition } from '../context/EditionContext';
import { TextField } from '../components/TextField';
import { ThankCastButton } from '../components/ThankCastButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';

export const ParentSignupScreen = ({ navigation }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToCOPPA, setAgreedToCOPPA] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Validation
  const validateForm = () => {
    const errors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain an uppercase letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain a number';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!agreedToTerms) {
      errors.terms = 'You must agree to the Terms of Service';
    }

    if (!agreedToPrivacy) {
      errors.privacy = 'You must agree to the Privacy Policy';
    }

    if (!agreedToCOPPA) {
      errors.coppa = 'COPPA consent is required for this app';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle signup
  const handleSignup = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Create auth user
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (data?.user?.id) {
        // Insert parent profile
        const { error: profileError } = await supabase
          .from('parents')
          .insert({
            id: data.user.id,
            email,
            full_name: fullName,
            created_at: new Date().toISOString(),
          });

        if (profileError) {
          throw profileError;
        }

        // Record COPPA consent
        const { error: consentError } = await supabase
          .from('parental_consents')
          .insert({
            parent_id: data.user.id,
            consent_type: 'coppa',
            agreed: true,
            agreed_at: new Date().toISOString(),
          });

        if (consentError) {
          console.warn('Error recording COPPA consent:', consentError);
          // Continue anyway - signup was successful
        }

        // Success - navigate to parent dashboard
        navigation?.replace('ParentDashboard');
      }
    } catch (err) {
      console.error('Signup error:', err);

      // User-friendly error messages
      if (err.message?.includes('already registered')) {
        setError('This email is already registered. Please log in instead.');
      } else if (err.message?.includes('Invalid')) {
        setError('Invalid email or password format');
      } else {
        setError(err.message || 'An error occurred during signup. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkboxSize = isKidsEdition ? 22 : 18;
  const fontSize = isKidsEdition ? 14 : 12;
  const paddingHorizontal = isKidsEdition ? theme.spacing.lg : theme.spacing.md;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.neutral.white }]}>
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
                  color: theme.colors.neutral.dark,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                  marginBottom: theme.spacing.sm,
                },
              ]}
            >
              Welcome to ThankCast
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: isKidsEdition ? 16 : 14,
                  color: theme.colors.neutral.mediumGray,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                },
              ]}
            >
              Let's create special moments together
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
            label="Full Name"
            placeholder="Your name"
            value={fullName}
            onChangeText={setFullName}
            error={validationErrors.fullName}
            required
          />

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
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            showPasswordToggle
            error={validationErrors.password}
            required
          />

          <TextField
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            showPasswordToggle
            error={validationErrors.confirmPassword}
            required
          />

          {/* Password Requirements Info */}
          <View style={[
            styles.infoBox,
            {
              backgroundColor: theme.colors.neutral.lightGray,
              borderRadius: isKidsEdition
                ? theme.borderRadius.medium
                : theme.borderRadius.small,
              padding: theme.spacing.sm,
              marginBottom: theme.spacing.md,
            },
          ]}>
            <Text
              style={[
                {
                  fontSize: isKidsEdition ? 12 : 11,
                  color: theme.colors.neutral.mediumGray,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                },
              ]}
            >
              Password must be at least 8 characters with 1 uppercase letter and 1 number
            </Text>
          </View>

          {/* Consent Checkboxes */}
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text
              style={[
                {
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.colors.neutral.dark,
                  marginBottom: theme.spacing.sm,
                },
              ]}
            >
              Agreements
            </Text>

            {/* Terms of Service */}
            <TouchableOpacity
              style={[
                styles.checkboxRow,
                {
                  marginBottom: theme.spacing.md,
                },
              ]}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    width: checkboxSize,
                    height: checkboxSize,
                    borderRadius: checkboxSize / 4,
                    borderColor: theme.colors.brand.coral,
                    backgroundColor: agreedToTerms
                      ? theme.colors.brand.coral
                      : 'transparent',
                  },
                ]}
              >
                {agreedToTerms && (
                  <Ionicons
                    name="checkmark"
                    size={checkboxSize - 4}
                    color="#FFFFFF"
                  />
                )}
              </View>
              <Text
                style={[
                  styles.checkboxLabel,
                  {
                    fontSize,
                    color: validationErrors.terms
                      ? theme.colors.semantic.error
                      : theme.colors.neutral.dark,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    marginLeft: theme.spacing.sm,
                  },
                ]}
              >
                I agree to Terms of Service
              </Text>
            </TouchableOpacity>

            {validationErrors.terms && (
              <Text
                style={[
                  {
                    fontSize: isKidsEdition ? 12 : 11,
                    color: theme.colors.semantic.error,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    marginLeft: checkboxSize + theme.spacing.sm,
                    marginTop: -theme.spacing.sm,
                    marginBottom: theme.spacing.sm,
                  },
                ]}
              >
                {validationErrors.terms}
              </Text>
            )}

            {/* Privacy Policy */}
            <TouchableOpacity
              style={[
                styles.checkboxRow,
                {
                  marginBottom: theme.spacing.md,
                },
              ]}
              onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    width: checkboxSize,
                    height: checkboxSize,
                    borderRadius: checkboxSize / 4,
                    borderColor: theme.colors.brand.coral,
                    backgroundColor: agreedToPrivacy
                      ? theme.colors.brand.coral
                      : 'transparent',
                  },
                ]}
              >
                {agreedToPrivacy && (
                  <Ionicons
                    name="checkmark"
                    size={checkboxSize - 4}
                    color="#FFFFFF"
                  />
                )}
              </View>
              <Text
                style={[
                  styles.checkboxLabel,
                  {
                    fontSize,
                    color: validationErrors.privacy
                      ? theme.colors.semantic.error
                      : theme.colors.neutral.dark,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    marginLeft: theme.spacing.sm,
                  },
                ]}
              >
                I agree to Privacy Policy
              </Text>
            </TouchableOpacity>

            {validationErrors.privacy && (
              <Text
                style={[
                  {
                    fontSize: isKidsEdition ? 12 : 11,
                    color: theme.colors.semantic.error,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    marginLeft: checkboxSize + theme.spacing.sm,
                    marginTop: -theme.spacing.sm,
                    marginBottom: theme.spacing.sm,
                  },
                ]}
              >
                {validationErrors.privacy}
              </Text>
            )}

            {/* COPPA Consent */}
            <TouchableOpacity
              style={[
                styles.checkboxRow,
                {
                  marginBottom: theme.spacing.md,
                },
              ]}
              onPress={() => setAgreedToCOPPA(!agreedToCOPPA)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    width: checkboxSize,
                    height: checkboxSize,
                    borderRadius: checkboxSize / 4,
                    borderColor: theme.colors.brand.coral,
                    backgroundColor: agreedToCOPPA
                      ? theme.colors.brand.coral
                      : 'transparent',
                  },
                ]}
              >
                {agreedToCOPPA && (
                  <Ionicons
                    name="checkmark"
                    size={checkboxSize - 4}
                    color="#FFFFFF"
                  />
                )}
              </View>
              <Text
                style={[
                  styles.checkboxLabel,
                  {
                    fontSize,
                    color: validationErrors.coppa
                      ? theme.colors.semantic.error
                      : theme.colors.neutral.dark,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    marginLeft: theme.spacing.sm,
                  },
                ]}
              >
                I consent to COPPA requirements for kids app
              </Text>
            </TouchableOpacity>

            {validationErrors.coppa && (
              <Text
                style={[
                  {
                    fontSize: isKidsEdition ? 12 : 11,
                    color: theme.colors.semantic.error,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    marginLeft: checkboxSize + theme.spacing.sm,
                    marginTop: -theme.spacing.sm,
                  },
                ]}
              >
                {validationErrors.coppa}
              </Text>
            )}
          </View>

          {/* Sign Up Button */}
          <ThankCastButton
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            disabled={loading}
            style={{ marginBottom: theme.spacing.md }}
          />

          {/* Login Link */}
          <View style={[styles.loginLinkContainer, { marginBottom: theme.spacing.lg }]}>
            <Text
              style={[
                {
                  fontSize,
                  color: theme.colors.neutral.mediumGray,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                },
              ]}
            >
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation?.navigate('ParentLogin')}>
              <Text
                style={[
                  {
                    fontSize,
                    color: theme.colors.brand.coral,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  },
                ]}
              >
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading Overlay */}
      <LoadingSpinner
        visible={loading}
        message="Creating your account..."
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
    paddingTop: 20,
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
  infoBox: {
    justifyContent: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontWeight: '400',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ParentSignupScreen;
