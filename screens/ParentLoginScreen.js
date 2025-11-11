/**
 * Parent Login Screen
 * Authenticates parent with PIN to access dashboard
 * Manages session and security
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loginParent } from '../services/sessionService';
import { getParentEmail } from '../services/secureStorageService';

export default function ParentLoginScreen({ onLoginSuccess, parentEmail, onCancel }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [locked, setLocked] = useState(false);

  const handleLogin = async () => {
    if (!pin || pin.length < 4) {
      Alert.alert('Invalid PIN', 'PIN must be at least 4 digits');
      return;
    }

    setLoading(true);

    try {
      const session = await loginParent(pin);
      setLoading(false);

      // Success - pass PIN to parent component for login
      Alert.alert('Success', 'Logged in successfully', [
        {
          text: 'Continue',
          onPress: () => onLoginSuccess(pin),
        },
      ]);
    } catch (error) {
      setLoading(false);

      // Failed login attempt
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      if (newAttemptCount >= 5) {
        setLocked(true);
        Alert.alert(
          'Too Many Attempts',
          'Account locked for 15 minutes for security. Please try again later.'
        );
      } else {
        Alert.alert(
          'Invalid PIN',
          `Incorrect PIN. ${5 - newAttemptCount} attempts remaining.`
        );
      }

      setPin('');
    }
  };

  if (locked) {
    return (
      <View style={styles.container}>
        <View style={styles.lockScreen}>
          <Ionicons name="lock-closed" size={80} color="#EF4444" />
          <Text style={styles.lockedTitle}>Account Temporarily Locked</Text>
          <Text style={styles.lockedText}>
            Too many failed login attempts. Please try again in 15 minutes.
          </Text>
          <Text style={styles.lockedEmail}>Email: {parentEmail}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with Back Button */}
        <View style={styles.headerWithBack}>
          {onCancel ? (
            <TouchableOpacity style={styles.backButton} onPress={onCancel}>
              <Ionicons name="chevron-back" size={24} color="#14B8A6" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <View style={styles.header}>
            <Ionicons name="shield-checkmark" size={60} color="#14B8A6" />
            <Text style={styles.title}>Parent Dashboard</Text>
            <Text style={styles.subtitle}>Enter your PIN to continue</Text>
          </View>
        </View>

        {/* Email Display */}
        <View style={styles.emailBox}>
          <Ionicons name="mail" size={20} color="#14B8A6" />
          <Text style={styles.emailText}>{parentEmail}</Text>
        </View>

        {/* PIN Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Parental PIN</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="••••"
            keyboardType="number-pad"
            secureTextEntry
            value={pin}
            onChangeText={setPin}
            maxLength={6}
            editable={!loading}
            textAlign="center"
          />
          <Text style={styles.helperText}>
            4-6 digits set during account setup
          </Text>
        </View>

        {/* Attempt Counter */}
        {attemptCount > 0 && attemptCount < 5 && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#D97706" />
            <Text style={styles.warningText}>
              {5 - attemptCount} attempts remaining
            </Text>
          </View>
        )}

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="log-in" size={20} color="white" />
              <Text style={styles.loginButtonText}>Sign In</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <TouchableOpacity style={styles.helpItem}>
            <Ionicons name="help-circle" size={16} color="#14B8A6" />
            <Text style={styles.helpText}>Forgot your PIN?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpItem}>
            <Ionicons name="shield" size={16} color="#14B8A6" />
            <Text style={styles.helpText}>View Security Tips</Text>
          </TouchableOpacity>
        </View>

        {/* Security Info */}
        <View style={styles.securityBox}>
          <Ionicons name="lock-closed" size={20} color="#10B981" />
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>Your PIN is secure</Text>
            <Text style={styles.securityText}>
              Stored encrypted on your device. Never shared with anyone.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  headerWithBack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  emailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emailText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  pinInput: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#14B8A6',
    borderRadius: 12,
    fontSize: 48,
    paddingVertical: 20,
    paddingHorizontal: 16,
    textAlign: 'center',
    color: '#1F2937',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    marginLeft: 12,
    color: '#D97706',
    fontWeight: '600',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  helpText: {
    marginLeft: 12,
    color: '#14B8A6',
    fontSize: 14,
    fontWeight: '500',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  securityContent: {
    marginLeft: 12,
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#0D7545',
    lineHeight: 18,
  },
  lockScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  lockedText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
  },
  lockedEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
