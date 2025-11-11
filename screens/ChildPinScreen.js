/**
 * Child PIN Screen
 * Simple gate to ensure only authorized child can access recording
 * Prevents siblings from accidentally recording videos
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { activateChildMode } from '../services/sessionService';

export default function ChildPinScreen({ childName, onAccessGranted, onCancel }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const handleUnlock = async () => {
    if (!pin || pin.length < 4) {
      Alert.alert('Invalid PIN', 'PIN must be at least 4 digits');
      return;
    }

    setLoading(true);

    try {
      // Activate child mode
      await activateChildMode(pin);

      // Success
      setLoading(false);
      if (onAccessGranted) {
        onAccessGranted();
      }
    } catch (error) {
      setLoading(false);

      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      if (newAttemptCount >= 3) {
        Alert.alert(
          'Too Many Attempts',
          'Please ask a parent for help.',
          [
            {
              text: 'Go Back',
              onPress: onCancel,
            },
          ]
        );
      } else {
        Alert.alert(
          'Incorrect PIN',
          `${3 - newAttemptCount} try left`
        );
      }

      setPin('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Icon */}
        <View style={styles.iconBox}>
          <Ionicons name="lock-closed" size={80} color="#14B8A6" />
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>Hey {childName}!</Text>
        <Text style={styles.subtitle}>
          Enter your PIN to start recording
        </Text>

        {/* PIN Input */}
        <View style={styles.pinInputContainer}>
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
        </View>

        {/* Unlock Button */}
        <TouchableOpacity
          style={[styles.unlockButton, loading && styles.buttonDisabled]}
          onPress={handleUnlock}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="unlock" size={24} color="white" />
              <Text style={styles.unlockButtonText}>Unlock</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onCancel}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={20} color="#14B8A6" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>

        {/* Fun Tip */}
        <View style={styles.tipBox}>
          <Ionicons name="bulb" size={20} color="#F59E0B" />
          <Text style={styles.tipText}>
            Get ready to show your best smile! {childName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  contentContainer: {
    alignItems: 'center',
  },
  iconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  pinInputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  pinInput: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#14B8A6',
    borderRadius: 16,
    fontSize: 64,
    paddingVertical: 24,
    textAlign: 'center',
    color: '#1F2937',
  },
  unlockButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 12,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  unlockButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 32,
  },
  backButtonText: {
    color: '#14B8A6',
    fontSize: 16,
    fontWeight: '600',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    width: '100%',
  },
  tipText: {
    flex: 1,
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
