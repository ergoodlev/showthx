/**
 * KidPINLoginScreen
 * Simple PIN login for kids with large buttons
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEdition } from '../context/EditionContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';

export const KidPINLoginScreen = ({ navigation }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';

  // State
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTime, setLockTime] = useState(null);

  // Check lock status on mount
  useEffect(() => {
    checkLockStatus();
  }, []);

  // Countdown lockout timer
  useEffect(() => {
    if (!locked || !lockTime) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lockTime;
      const remaining = 900000 - elapsed; // 15 minutes in ms

      if (remaining <= 0) {
        setLocked(false);
        setAttempts(0);
        setLockTime(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [locked, lockTime]);

  const checkLockStatus = async () => {
    try {
      const storedLockTime = await AsyncStorage.getItem('kidPINLockTime');
      const storedAttempts = await AsyncStorage.getItem('kidPINAttempts');

      if (storedLockTime) {
        const lockTimeMs = parseInt(storedLockTime);
        const now = Date.now();
        const elapsed = now - lockTimeMs;

        if (elapsed < 900000) {
          // Still locked (15 minutes = 900000 ms)
          setLocked(true);
          setLockTime(lockTimeMs);
        } else {
          // Lock expired
          await AsyncStorage.removeItem('kidPINLockTime');
          await AsyncStorage.removeItem('kidPINAttempts');
        }
      } else if (storedAttempts) {
        setAttempts(parseInt(storedAttempts));
      }
    } catch (err) {
      console.error('Error checking lock status:', err);
    }
  };

  const handleDigitPress = (digit) => {
    if (locked) return;
    if (pin.length < 4) {
      setPin(pin + digit);
      setError(null);
    }
  };

  const handleDelete = () => {
    if (locked) return;
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (locked || pin.length !== 4) return;

    try {
      setLoading(true);
      setError(null);

      // Find child with this PIN
      const { data: child, error: queryError } = await supabase
        .from('children')
        .select('id, name, parent_id')
        .eq('pin', pin)
        .single();

      if (queryError || !child) {
        // Wrong PIN
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        await AsyncStorage.setItem('kidPINAttempts', newAttempts.toString());

        if (newAttempts >= 5) {
          // Lock after 5 attempts
          const now = Date.now();
          setLocked(true);
          setLockTime(now);
          await AsyncStorage.setItem('kidPINLockTime', now.toString());
          setError('Too many attempts. Try again in 15 minutes.');
        } else {
          setError('Wrong PIN. Try again. (' + (5 - newAttempts) + ' attempts remaining)');
        }
        setPin('');
        return;
      }

      // Correct PIN - store session
      await AsyncStorage.setItem('kidSessionId', child.id);
      await AsyncStorage.setItem('kidName', child.name);

      // Reset attempts
      await AsyncStorage.removeItem('kidPINAttempts');

      // Navigate to kid home
      navigation?.replace('KidPendingGifts');
    } catch (err) {
      console.error('Login error:', err);
      setError('Error logging in. Try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const digits = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', ''],
  ];

  const buttonSize = isKidsEdition ? 72 : 60;
  const fontSize = isKidsEdition ? 32 : 28;
  const pinDisplaySize = isKidsEdition ? 20 : 16;

  const getRemainingTime = () => {
    if (!lockTime) return '';
    const now = Date.now();
    const elapsed = now - lockTime;
    const remaining = Math.max(0, 900000 - elapsed);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.neutral.white }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {/* Header */}
        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 28 : 24,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              color: theme.colors.neutral.dark,
              marginBottom: 8,
              fontWeight: '700',
            }}
          >
            Hi! Enter your PIN
          </Text>
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.colors.neutral.mediumGray,
              fontWeight: '400',
            }}
          >
            Ask a grown-up if you need help
          </Text>
        </View>

        {/* PIN Display */}
        <View
          style={{
            marginBottom: 40,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                width: pinDisplaySize * 2,
                height: pinDisplaySize * 2,
                borderRadius: pinDisplaySize,
                backgroundColor: i < pin.length ? theme.colors.brand.coral : theme.colors.neutral.lightGray,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: i < pin.length ? theme.colors.brand.coral : theme.colors.neutral.mediumGray,
              }}
            />
          ))}
        </View>

        {/* Error Message */}
        {error && (
          <View
            style={{
              backgroundColor: theme.colors.semantic.error,
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              maxWidth: 280,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                textAlign: 'center',
              }}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Locked Message */}
        {locked && (
          <View
            style={{
              backgroundColor: theme.colors.semantic.warning,
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
              maxWidth: 280,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: theme.colors.neutral.dark,
                fontSize: isKidsEdition ? 16 : 14,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                marginBottom: 8,
                fontWeight: '700',
              }}
            >
              Too many tries!
            </Text>
            <Text
              style={{
                color: theme.colors.neutral.dark,
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                textAlign: 'center',
              }}
            >
              Try again in {getRemainingTime()}
            </Text>
          </View>
        )}

        {/* Number Pad */}
        <View style={{ marginBottom: 20 }}>
          {digits.map((row, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              {row.map((digit, colIndex) => (
                <TouchableOpacity
                  key={colIndex}
                  disabled={locked || digit === '' || (pin.length === 4 && digit !== '')}
                  onPress={() => handleDigitPress(digit)}
                  style={{
                    width: buttonSize,
                    height: buttonSize,
                    borderRadius: buttonSize / 2,
                    backgroundColor:
                      digit === ''
                        ? 'transparent'
                        : locked || (pin.length === 4 && digit !== '')
                        ? theme.colors.neutral.lightGray
                        : theme.colors.brand.coral,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: digit === '' ? 'transparent' : '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  {digit !== '' && (
                    <Text
                      style={{
                        fontSize,
                        fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                        color: '#FFFFFF',
                        fontWeight: '700',
                      }}
                    >
                      {digit}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Clear and Enter Buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            disabled={locked || pin.length === 0}
            onPress={handleDelete}
            style={{
              width: buttonSize + 20,
              height: buttonSize,
              borderRadius: 12,
              backgroundColor:
                locked || pin.length === 0 ? theme.colors.neutral.lightGray : theme.colors.brand.teal,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons
              name="arrow-back"
              size={isKidsEdition ? 28 : 24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={locked || pin.length !== 4}
            onPress={handleSubmit}
            style={{
              width: buttonSize + 20,
              height: buttonSize,
              borderRadius: 12,
              backgroundColor:
                locked || pin.length !== 4 ? theme.colors.neutral.lightGray : theme.colors.semantic.success,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons
              name="checkmark"
              size={isKidsEdition ? 32 : 28}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      <LoadingSpinner visible={loading} message="Checking PIN..." fullScreen />
    </SafeAreaView>
  );
};

export default KidPINLoginScreen;
