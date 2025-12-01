/**
 * Parental Consent Screen - COPPA Compliant
 * Implements secure child data protection and parental setup
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  storeParentPin,
  storeParentEmail,
} from '../services/secureStorageService';
import { generateKeypair } from '../services/encryptionService';
import { logParentalConsent } from '../services/auditLogService';

export default function ParentalConsentScreen({ onConsentComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [dataUseChecked, setDataUseChecked] = useState(false);
  const [encryptionChecked, setEncryptionChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    setStep(2);
  };

  const handlePinSubmit = () => {
    if (!pin || pin.length < 4 || pin.length > 6) {
      Alert.alert('Invalid PIN', 'PIN must be 4-6 digits');
      return;
    }

    if (pin !== pinConfirm) {
      Alert.alert('PIN Mismatch', 'PINs do not match. Please try again.');
      setPinConfirm('');
      return;
    }

    if (!/^\d+$/.test(pin)) {
      Alert.alert('Invalid PIN', 'PIN must contain only digits');
      return;
    }

    setStep(3);
  };

  const handleCompleteConsent = async () => {
    if (!privacyChecked || !dataUseChecked) {
      Alert.alert(
        'Missing Consent',
        'You must accept the privacy policy and data use agreement to continue.'
      );
      return;
    }

    setLoading(true);

    try {
      // Store credentials securely
      await storeParentEmail(email);
      await storeParentPin(pin);

      // Generate encryption keys if opted in
      if (encryptionChecked) {
        await generateKeypair();
        console.log('[PARENTAL] Encryption enabled with keypair');
      }

      // Log consent
      await logParentalConsent(
        'parent_setup',
        'parental_consent_given',
        true
      );

      // Mark setup complete
      setStep(4);

      // Call parent callback
      setTimeout(() => {
        onConsentComplete({
          email,
          encryptionEnabled: encryptionChecked,
        });
      }, 1500);
    } catch (error) {
      console.error('[PARENTAL ERROR] Failed to save consent:', error);
      Alert.alert('Error', 'Failed to save your settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Introduction
  if (step === 1) {
    return (
      <View style={styles.container}>
        {/* Back Button */}
        <View style={styles.topBar}>
          {onCancel ? (
            <TouchableOpacity style={styles.backBtn} onPress={onCancel}>
              <Ionicons name="chevron-back" size={28} color="#14B8A6" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={60} color="#14B8A6" />
          </View>

          <Text style={styles.title}>Welcome to GratituGram</Text>

          <Text style={styles.subtitle}>
            We take child safety and privacy seriously. This setup will configure your account
            to keep your child's data protected.
          </Text>

          <View style={styles.featureList}>
            <FeatureItem
              icon="lock-closed"
              title="Secure Storage"
              description="Child data stored securely on device and encrypted in cloud"
            />
            <FeatureItem
              icon="trash"
              title="Auto-Delete"
              description="Videos automatically deleted after 7-90 days"
            />
            <FeatureItem
              icon="eye"
              title="Audit Logs"
              description="Complete record of all data access for compliance"
            />
            <FeatureItem
              icon="shield"
              title="COPPA Compliant"
              description="Meets federal child privacy requirements"
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setStep(1.5)}
          >
            <Text style={styles.buttonText}>Let's Secure Your Account</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>

          <Text style={styles.legalText}>
            By continuing, you confirm you are the parent or legal guardian of the child.
          </Text>
        </ScrollView>
      </View>
    );
  }

  // Step 1.5: Enter email
  if (step === 1.5) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerIcon}>
            <Ionicons name="mail" size={60} color="#14B8A6" />
          </View>

          <Text style={styles.title}>Parent Email Address</Text>

          <Text style={styles.description}>
            We'll use this email for important account notifications and password recovery.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="parent@example.com"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleEmailSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setStep(1)}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Step 2: Set PIN
  if (step === 2) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerIcon}>
            <Ionicons name="keypad" size={60} color="#14B8A6" />
          </View>

          <Text style={styles.title}>Set Parental PIN</Text>

          <Text style={styles.description}>
            Create a 4-6 digit PIN to protect parental settings. You'll need this to approve
            videos and change settings.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="••••"
            keyboardType="number-pad"
            secureTextEntry
            value={pin}
            onChangeText={setPin}
            maxLength={6}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm PIN: ••••"
            keyboardType="number-pad"
            secureTextEntry
            value={pinConfirm}
            onChangeText={setPinConfirm}
            maxLength={6}
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handlePinSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setStep(1.5)}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Step 3: Privacy & Consent
  if (step === 3) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerIcon}>
            <Ionicons name="document-text" size={60} color="#14B8A6" />
          </View>

          <Text style={styles.title}>Privacy & Consent</Text>

          <Text style={styles.description}>
            Please read and agree to the following to continue:
          </Text>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setPrivacyChecked(!privacyChecked)}
            disabled={loading}
          >
            <View style={styles.checkbox}>
              {privacyChecked && (
                <Ionicons name="checkmark" size={20} color="#14B8A6" />
              )}
            </View>
            <View style={styles.checkboxText}>
              <Text style={styles.checkboxLabel}>
                Privacy Policy - Child Data Protection
              </Text>
              <Text style={styles.checkboxDescription}>
                I understand that GratituGram collects only essential data needed to operate
                the service, stores it securely, and deletes it automatically according to
                retention policies.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setDataUseChecked(!dataUseChecked)}
            disabled={loading}
          >
            <View style={styles.checkbox}>
              {dataUseChecked && (
                <Ionicons name="checkmark" size={20} color="#14B8A6" />
              )}
            </View>
            <View style={styles.checkboxText}>
              <Text style={styles.checkboxLabel}>COPPA Compliance</Text>
              <Text style={styles.checkboxDescription}>
                I confirm I am the parent/guardian and consent to the collection and use of
                my child's information in accordance with COPPA and all applicable laws.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setEncryptionChecked(!encryptionChecked)}
            disabled={loading}
          >
            <View style={styles.checkbox}>
              {encryptionChecked && (
                <Ionicons name="checkmark" size={20} color="#14B8A6" />
              )}
            </View>
            <View style={styles.checkboxText}>
              <Text style={styles.checkboxLabel}>
                Optional: End-to-End Encryption
              </Text>
              <Text style={styles.checkboxDescription}>
                Enable advanced encryption for maximum privacy. Videos can only be viewed
                with your encryption keys.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCompleteConsent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.buttonText}>Complete Setup</Text>
                <Ionicons name="checkmark-circle" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setStep(2)}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Step 4: Complete
  if (step === 4) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerIcon}>
            <Ionicons name="checkmark-circle" size={60} color="#14B8A6" />
          </View>

          <Text style={styles.title}>All Set!</Text>

          <Text style={styles.description}>
            Your account has been secured and configured to protect your child's privacy.
          </Text>

          <View style={styles.summaryBox}>
            <SummaryItem
              icon="mail"
              label="Email"
              value={email}
            />
            <SummaryItem
              icon="lock-closed"
              label="PIN Protection"
              value="Enabled"
            />
            {encryptionChecked && (
              <SummaryItem
                icon="shield"
                label="Encryption"
                value="Enabled"
              />
            )}
          </View>

          <Text style={styles.smallText}>
            You can change these settings anytime from your parental dashboard.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              console.log('[CONSENT] Start button pressed, calling onConsentComplete');
              onConsentComplete();
            }}
          >
            <Text style={styles.buttonText}>Start Using GratituGram</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return null;
}

function FeatureItem({ icon, title, description }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={24} color="#14B8A6" />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

function SummaryItem({ icon, label, value }) {
  return (
    <View style={styles.summaryItem}>
      <View style={styles.summaryIconBox}>
        <Ionicons name={icon} size={20} color="#14B8A6" />
      </View>
      <View style={styles.summaryContent}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  headerIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 21,
  },
  featureList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#14B8A6',
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#14B8A6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
    backgroundColor: '#CCFBF1',
  },
  checkboxText: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  checkboxDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  summaryBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  legalText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  smallText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
