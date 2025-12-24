/**
 * ParentSignupScreen
 * New parent account creation with email, password, and COPPA consent
 * Offers choice between email signup or Apple Sign In
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
  Modal,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { useEdition } from '../context/EditionContext';
import { TextField } from '../components/TextField';
import { ThankCastButton } from '../components/ThankCastButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { parentSignup, signInWithApple } from '../services/authService';
import { sendParentWelcomeEmail } from '../services/emailService';
import { TERMS_OF_SERVICE, PRIVACY_POLICY, COPPA_COMPLIANCE } from '../constants/legalTexts';

export const ParentSignupScreen = ({ navigation }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  // Auth method selection: 'selection' | 'email' | 'apple'
  const [authMethod, setAuthMethod] = useState('selection');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToCOPPA, setAgreedToCOPPA] = useState(false);
  const [isEighteenOrOlder, setIsEighteenOrOlder] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Apple Sign In state
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  // Check if running in Expo Go (Apple Sign In won't work there)
  const isExpoGo = Constants.appOwnership === 'expo';

  // Check Apple Sign In availability on mount
  React.useEffect(() => {
    const checkAppleAuth = async () => {
      if (Platform.OS === 'ios') {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setAppleAuthAvailable(isAvailable);
      }
    };
    checkAppleAuth();
  }, []);

  // Handle Apple Sign In
  const handleAppleSignIn = async () => {
    // Check if running in Expo Go
    if (isExpoGo) {
      Alert.alert(
        'Development Build Required',
        'Apple Sign In requires a development or production build. It does not work in Expo Go.\n\nPlease use email signup for testing, or create a development build.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate consents first
    if (!validateConsents()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await signInWithApple();

      if (result.cancelled) {
        return;
      }

      if (!result.success) {
        setError(result.error || 'Apple Sign In failed. Please try again.');
        return;
      }

      console.log('✅ Apple Sign In successful');
      // RootNavigator will detect session and navigate
    } catch (err) {
      console.error('❌ Apple Sign In error:', err);
      setError('Apple Sign In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Modal state for viewing policies
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [activePolicyType, setActivePolicyType] = useState(null);

  const openPolicyModal = (type) => {
    setActivePolicyType(type);
    setShowPolicyModal(true);
  };

  const getPolicyContent = () => {
    switch (activePolicyType) {
      case 'terms':
        return { title: 'Terms of Service', content: TERMS_OF_SERVICE };
      case 'privacy':
        return { title: 'Privacy Policy', content: PRIVACY_POLICY };
      case 'coppa':
        return { title: 'COPPA Compliance', content: COPPA_COMPLIANCE };
      default:
        return { title: '', content: '' };
    }
  };

  // Validate consents only (for Apple Sign In)
  const validateConsents = () => {
    const errors = {};

    if (!isEighteenOrOlder) {
      errors.age = 'You must be at least 18 years old to create an account';
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

  // Full validation (for email signup)
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

    if (!isEighteenOrOlder) {
      errors.age = 'You must be at least 18 years old to create an account';
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

      // Use auth service for signup
      const result = await parentSignup(email, password, fullName);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Check if email confirmation is required
      if (result.emailConfirmationRequired) {
        setLoading(false);
        Alert.alert(
          'Check Your Email',
          'We sent a confirmation link to ' + email + '. Please click it to complete your signup, then come back and log in.',
          [
            {
              text: 'OK, Go to Login',
              onPress: () => navigation?.navigate('ParentLogin'),
            },
          ]
        );
        return;
      }

      // Send welcome email
      await sendParentWelcomeEmail(email, fullName);

      // Navigate to parent dashboard
      navigation?.replace('ParentDashboard');
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

  // Reset to method selection
  const handleBack = () => {
    setAuthMethod('selection');
    setError(null);
    setValidationErrors({});
  };

  const checkboxSize = isKidsEdition ? 22 : 18;
  const fontSize = isKidsEdition ? 14 : 12;
  const paddingHorizontal = isKidsEdition ? theme.spacing.lg : theme.spacing.md;

  // Render consent checkboxes (used by both email and Apple flows)
  const renderConsentCheckboxes = () => (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text
        style={[
          {
            fontSize: isKidsEdition ? 14 : 12,
            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
            color: theme.neutralColors.dark,
            marginBottom: theme.spacing.sm,
          },
        ]}
      >
        Agreements
      </Text>

      {/* Age Verification - 18+ COPPA REQUIRED */}
      <TouchableOpacity
        style={[
          styles.checkboxRow,
          {
            marginBottom: theme.spacing.md,
          },
        ]}
        onPress={() => setIsEighteenOrOlder(!isEighteenOrOlder)}
      >
        <View
          style={[
            styles.checkbox,
            {
              width: checkboxSize,
              height: checkboxSize,
              borderRadius: checkboxSize / 4,
              borderColor: theme.brandColors.teal,
              backgroundColor: isEighteenOrOlder
                ? theme.brandColors.teal
                : 'transparent',
            },
          ]}
        >
          {isEighteenOrOlder && (
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
              color: validationErrors.age
                ? theme.semanticColors.error
                : theme.neutralColors.dark,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              marginLeft: theme.spacing.sm,
            },
          ]}
        >
          I confirm that I am at least 18 years old
        </Text>
      </TouchableOpacity>

      {validationErrors.age && (
        <Text
          style={[
            {
              fontSize: isKidsEdition ? 12 : 11,
              color: theme.semanticColors.error,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              marginLeft: checkboxSize + theme.spacing.sm,
              marginTop: -theme.spacing.sm,
              marginBottom: theme.spacing.sm,
            },
          ]}
        >
          {validationErrors.age}
        </Text>
      )}

      {/* Terms of Service */}
      <View
        style={[
          styles.checkboxRow,
          {
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        <TouchableOpacity onPress={() => setAgreedToTerms(!agreedToTerms)}>
          <View
            style={[
              styles.checkbox,
              {
                width: checkboxSize,
                height: checkboxSize,
                borderRadius: checkboxSize / 4,
                borderColor: theme.brandColors.coral,
                backgroundColor: agreedToTerms
                  ? theme.brandColors.coral
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
        </TouchableOpacity>
        <Text
          style={[
            styles.checkboxLabel,
            {
              fontSize,
              color: validationErrors.terms
                ? theme.semanticColors.error
                : theme.neutralColors.dark,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              marginLeft: theme.spacing.sm,
            },
          ]}
        >
          I agree to the{' '}
          <Text
            style={{ color: theme.brandColors.coral, textDecorationLine: 'underline' }}
            onPress={() => openPolicyModal('terms')}
          >
            Terms of Service
          </Text>
        </Text>
      </View>

      {validationErrors.terms && (
        <Text
          style={[
            {
              fontSize: isKidsEdition ? 12 : 11,
              color: theme.semanticColors.error,
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
      <View
        style={[
          styles.checkboxRow,
          {
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        <TouchableOpacity onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}>
          <View
            style={[
              styles.checkbox,
              {
                width: checkboxSize,
                height: checkboxSize,
                borderRadius: checkboxSize / 4,
                borderColor: theme.brandColors.coral,
                backgroundColor: agreedToPrivacy
                  ? theme.brandColors.coral
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
        </TouchableOpacity>
        <Text
          style={[
            styles.checkboxLabel,
            {
              fontSize,
              color: validationErrors.privacy
                ? theme.semanticColors.error
                : theme.neutralColors.dark,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              marginLeft: theme.spacing.sm,
            },
          ]}
        >
          I agree to the{' '}
          <Text
            style={{ color: theme.brandColors.coral, textDecorationLine: 'underline' }}
            onPress={() => openPolicyModal('privacy')}
          >
            Privacy Policy
          </Text>
        </Text>
      </View>

      {validationErrors.privacy && (
        <Text
          style={[
            {
              fontSize: isKidsEdition ? 12 : 11,
              color: theme.semanticColors.error,
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
      <View
        style={[
          styles.checkboxRow,
          {
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        <TouchableOpacity onPress={() => setAgreedToCOPPA(!agreedToCOPPA)}>
          <View
            style={[
              styles.checkbox,
              {
                width: checkboxSize,
                height: checkboxSize,
                borderRadius: checkboxSize / 4,
                borderColor: theme.brandColors.coral,
                backgroundColor: agreedToCOPPA
                  ? theme.brandColors.coral
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
        </TouchableOpacity>
        <Text
          style={[
            styles.checkboxLabel,
            {
              fontSize,
              color: validationErrors.coppa
                ? theme.semanticColors.error
                : theme.neutralColors.dark,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              marginLeft: theme.spacing.sm,
            },
          ]}
        >
          I consent to{' '}
          <Text
            style={{ color: theme.brandColors.coral, textDecorationLine: 'underline' }}
            onPress={() => openPolicyModal('coppa')}
          >
            COPPA requirements
          </Text>
        </Text>
      </View>

      {validationErrors.coppa && (
        <Text
          style={[
            {
              fontSize: isKidsEdition ? 12 : 11,
              color: theme.semanticColors.error,
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
  );

  // Render parental attestation notice
  const renderParentalNotice = () => (
    <View
      style={{
        backgroundColor: theme.neutralColors.lightGray,
        borderRadius: isKidsEdition ? theme.borderRadius.medium : theme.borderRadius.small,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.brandColors.teal,
      }}
    >
      <Text
        style={{
          fontSize: isKidsEdition ? 12 : 11,
          fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
          color: theme.neutralColors.dark,
          marginBottom: theme.spacing.xs,
        }}
      >
        Parental Responsibility Notice
      </Text>
      <Text
        style={{
          fontSize: isKidsEdition ? 11 : 10,
          fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
          color: theme.neutralColors.mediumGray,
          lineHeight: isKidsEdition ? 16 : 14,
        }}
      >
        By creating an account, you attest that you are at least 18 years old and will supervise all content created by your children. All videos created by children require your review and approval before they can be shared with anyone.
      </Text>
    </View>
  );

  // Render method selection screen
  const renderMethodSelection = () => (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { marginBottom: theme.spacing.xl }]}>
        <Image
          source={require('../assets/icon.png')}
          style={{
            width: 100,
            height: 100,
            marginBottom: theme.spacing.md,
          }}
          resizeMode="contain"
        />
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
          Welcome to ShowThx
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: '#06b6d4',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          #REELYGRATEFUL
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

      {/* Sign Up Options */}
      <Text
        style={{
          fontSize: isKidsEdition ? 16 : 14,
          fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
          color: theme.neutralColors.dark,
          textAlign: 'center',
          marginBottom: theme.spacing.lg,
        }}
      >
        Create your parent account
      </Text>

      {/* Apple Sign In Button - First option (if available) */}
      {appleAuthAvailable && Platform.OS === 'ios' && (
        <>
          <TouchableOpacity
            style={{
              backgroundColor: '#000000',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 16,
              borderRadius: isKidsEdition ? 12 : 8,
              marginBottom: theme.spacing.md,
            }}
            onPress={() => setAuthMethod('apple')}
          >
            <Ionicons name="logo-apple" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 17,
                fontWeight: '600',
              }}
            >
              Sign up with Apple
            </Text>
          </TouchableOpacity>

          {/* Expo Go Warning */}
          {isExpoGo && (
            <Text
              style={{
                fontSize: 11,
                color: theme.semanticColors.warning || '#f59e0b',
                textAlign: 'center',
                marginBottom: theme.spacing.sm,
                marginTop: -theme.spacing.xs,
              }}
            >
              Note: Apple Sign In requires a development build
            </Text>
          )}

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: theme.spacing.md }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.neutralColors.lightGray }} />
            <Text style={{ paddingHorizontal: theme.spacing.md, color: theme.neutralColors.mediumGray, fontSize: 12 }}>
              or
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.neutralColors.lightGray }} />
          </View>
        </>
      )}

      {/* Email Sign Up Button */}
      <TouchableOpacity
        style={{
          backgroundColor: theme.brandColors.coral,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 16,
          borderRadius: isKidsEdition ? 12 : 8,
          marginBottom: theme.spacing.lg,
        }}
        onPress={() => setAuthMethod('email')}
      >
        <Ionicons name="mail-outline" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 17,
            fontWeight: '600',
          }}
        >
          Sign up with Email
        </Text>
      </TouchableOpacity>

      {/* Login Link */}
      <View style={[styles.loginLinkContainer, { marginTop: theme.spacing.md }]}>
        <Text
          style={[
            {
              fontSize,
              color: theme.neutralColors.mediumGray,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            },
          ]}
        >
          Already have an account?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation?.replace('ParentLogin')}>
          <Text
            style={[
              {
                fontSize,
                color: theme.brandColors.coral,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              },
            ]}
          >
            Log In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render email signup form
  const renderEmailForm = () => (
    <View style={{ flex: 1 }}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={handleBack}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}
      >
        <Ionicons name="arrow-back" size={24} color={theme.brandColors.coral} />
        <Text
          style={{
            marginLeft: theme.spacing.xs,
            color: theme.brandColors.coral,
            fontSize: 14,
            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
          }}
        >
          Back
        </Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={[styles.header, { marginBottom: theme.spacing.lg }]}>
        <Text
          style={[
            styles.title,
            {
              fontSize: isKidsEdition ? 24 : 20,
              color: theme.neutralColors.dark,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
            },
          ]}
        >
          Create Account with Email
        </Text>
      </View>

      {/* Error Message */}
      {error && (
        <>
          <ErrorMessage
            message={error}
            onDismiss={() => setError(null)}
            autoDismiss={false}
            style={{ marginBottom: theme.spacing.md }}
          />

          {/* Show login button if email already registered */}
          {error.includes('already registered') && (
            <TouchableOpacity
              onPress={() => navigation?.replace('ParentLogin')}
              style={{
                marginBottom: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: theme.brandColors.coral,
                  fontSize: 14,
                  fontWeight: '600',
                  textDecorationLine: 'underline',
                }}
              >
                Go to Login Screen →
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Form Fields */}
      <TextField
        label="Full Name"
        placeholder="Your name"
        value={fullName}
        onChangeText={setFullName}
        textContentType="name"
        autoComplete="name"
        error={validationErrors.fullName}
        required
      />

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
        placeholder="At least 8 characters"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        showPasswordToggle
        autoCapitalize="none"
        textContentType="newPassword"
        autoComplete="password-new"
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
        autoCapitalize="none"
        textContentType="newPassword"
        autoComplete="password-new"
        error={validationErrors.confirmPassword}
        required
      />

      {/* Password Requirements Info */}
      <View style={[
        styles.infoBox,
        {
          backgroundColor: theme.neutralColors.lightGray,
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
              color: theme.neutralColors.mediumGray,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            },
          ]}
        >
          Password must be at least 8 characters with 1 uppercase letter and 1 number
        </Text>
      </View>

      {/* Consent Checkboxes */}
      {renderConsentCheckboxes()}

      {/* Parental Notice */}
      {renderParentalNotice()}

      {/* Sign Up Button */}
      <ThankCastButton
        title="Create Account"
        onPress={handleSignup}
        loading={loading}
        disabled={loading}
        style={{ marginBottom: theme.spacing.lg }}
      />
    </View>
  );

  // Render Apple signup flow (consents + Apple button)
  const renderAppleForm = () => (
    <View style={{ flex: 1 }}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={handleBack}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}
      >
        <Ionicons name="arrow-back" size={24} color={theme.brandColors.coral} />
        <Text
          style={{
            marginLeft: theme.spacing.xs,
            color: theme.brandColors.coral,
            fontSize: 14,
            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
          }}
        >
          Back
        </Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={[styles.header, { marginBottom: theme.spacing.lg }]}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#000000',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: theme.spacing.md,
          }}
        >
          <Ionicons name="logo-apple" size={36} color="#FFFFFF" />
        </View>
        <Text
          style={[
            styles.title,
            {
              fontSize: isKidsEdition ? 24 : 20,
              color: theme.neutralColors.dark,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
            },
          ]}
        >
          Sign up with Apple
        </Text>
        <Text
          style={{
            fontSize: isKidsEdition ? 14 : 12,
            color: theme.neutralColors.mediumGray,
            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            textAlign: 'center',
            marginTop: theme.spacing.xs,
          }}
        >
          Please agree to the following to continue
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

      {/* Expo Go Warning */}
      {isExpoGo && (
        <View
          style={{
            backgroundColor: '#fef3c7',
            borderRadius: 8,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
            borderLeftWidth: 4,
            borderLeftColor: '#f59e0b',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: '#92400e',
              marginBottom: 4,
            }}
          >
            Development Build Required
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: '#92400e',
            }}
          >
            Apple Sign In does not work in Expo Go. Please use email signup for testing, or create a development build.
          </Text>
        </View>
      )}

      {/* Consent Checkboxes */}
      {renderConsentCheckboxes()}

      {/* Parental Notice */}
      {renderParentalNotice()}

      {/* Apple Sign In Button */}
      {appleAuthAvailable && !isExpoGo ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
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
      ) : (
        <TouchableOpacity
          style={{
            backgroundColor: isExpoGo ? theme.neutralColors.mediumGray : '#000000',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 16,
            borderRadius: isKidsEdition ? 12 : 8,
            marginBottom: theme.spacing.md,
            opacity: isExpoGo ? 0.5 : 1,
          }}
          onPress={handleAppleSignIn}
          disabled={isExpoGo}
        >
          <Ionicons name="logo-apple" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 17,
              fontWeight: '600',
            }}
          >
            {isExpoGo ? 'Requires Dev Build' : 'Continue with Apple'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Alternative - use email instead */}
      <TouchableOpacity
        onPress={() => setAuthMethod('email')}
        style={{
          paddingVertical: theme.spacing.sm,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: theme.brandColors.coral,
            fontSize: 14,
            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
          }}
        >
          Use email instead
        </Text>
      </TouchableOpacity>
    </View>
  );

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
          {authMethod === 'selection' && renderMethodSelection()}
          {authMethod === 'email' && renderEmailForm()}
          {authMethod === 'apple' && renderAppleForm()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Policy Modal */}
      <Modal
        visible={showPolicyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPolicyModal(false)}
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
              {getPolicyContent().title}
            </Text>
            <TouchableOpacity onPress={() => setShowPolicyModal(false)}>
              <Ionicons name="close" size={28} color={theme.neutralColors.dark} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: theme.spacing.md }}
          >
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 13,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.dark,
                lineHeight: isKidsEdition ? 22 : 20,
              }}
            >
              {getPolicyContent().content}
            </Text>
          </ScrollView>
          <View
            style={{
              padding: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.neutralColors.lightGray,
            }}
          >
            <TouchableOpacity
              onPress={() => setShowPolicyModal(false)}
              style={{
                backgroundColor: theme.brandColors.coral,
                paddingVertical: theme.spacing.md,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Loading Overlay */}
      <LoadingSpinner
        visible={loading}
        message={authMethod === 'apple' ? 'Signing in with Apple...' : 'Creating your account...'}
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
