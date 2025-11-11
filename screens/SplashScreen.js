/**
 * Splash Screen - Modern Welcome Screen
 * 2025 Design with gradient background, modern typography, and smooth animations
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: screenHeight } = Dimensions.get('window');

export default function SplashScreen({ onLoginPressed, onSignUpPressed, onCheckingUser }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);
  const logoScale = React.useRef(new Animated.Value(0.5)).current;
  const contentOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkUserStatus();
    animateLogo();
  }, []);

  const checkUserStatus = async () => {
    try {
      if (onCheckingUser) {
        onCheckingUser();
      }
      const consent = await AsyncStorage.getItem('parentalConsentGiven');
      setHasConsent(consent === 'true');
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking user status:', error);
      setIsLoading(false);
    }
  };

  const animateLogo = () => {
    Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1e293b', '#0f172a', '#000000']}
        style={styles.container}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#e0f2fe" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1e293b', '#0f172a', '#000000']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Decorative gradient orbs */}
        <View style={styles.bgOrbContainer}>
          <View style={[styles.bgOrb, styles.orbTopRight]} />
          <View style={[styles.bgOrb, styles.orbBottomLeft]} />
        </View>

        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoSection,
            {
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={['#06b6d4', '#0891b2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Ionicons name="videocam" size={48} color="white" />
            </LinearGradient>
          </View>
          <Text style={styles.appTitle}>GratituGram</Text>
          <Text style={styles.appSubtitle}>Gratitude in Motion</Text>
        </Animated.View>

        {/* Content Section */}
        <Animated.View
          style={[
            styles.contentSection,
            {
              opacity: contentOpacity,
            },
          ]}
          pointerEvents="auto"
        >
          <View style={styles.featuresList}>
            <FeatureItem
              icon="videocam"
              title="Record Videos"
              description="Capture heartfelt thank you messages"
            />
            <FeatureItem
              icon="shield-checkmark"
              title="Parent Approved"
              description="Full parental control and oversight"
            />
            <FeatureItem
              icon="mail"
              title="Secure Sharing"
              description="24-hour secure email links"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => {
                console.log('[SPLASH] Create Account button pressed');
                onSignUpPressed();
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#06b6d4', '#0891b2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="person-add" size={20} color="white" />
                <Text style={styles.primaryButtonText}>Create Account</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => {
                console.log('[SPLASH] Sign In button pressed');
                onLoginPressed();
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#1e40af', '#1e3a8a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="log-in" size={20} color="white" />
                <Text style={styles.secondaryButtonText}>Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.legalText}>
              By continuing, you agree to our Terms of Service
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function FeatureItem({ icon, title, description }) {
  return (
    <View style={styles.featureItem}>
      <LinearGradient
        colors={['#06b6d4', '#0891b2']}
        style={styles.featureIcon}
      >
        <Ionicons name={icon} size={24} color="white" />
      </LinearGradient>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  bgOrbContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bgOrb: {
    position: 'absolute',
    borderRadius: 500,
    opacity: 0.1,
  },
  orbTopRight: {
    width: 400,
    height: 400,
    backgroundColor: '#06b6d4',
    top: -100,
    right: -100,
  },
  orbBottomLeft: {
    width: 300,
    height: 300,
    backgroundColor: '#0891b2',
    bottom: -50,
    left: -50,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoWrapper: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '500',
  },
  contentSection: {
    flex: 1,
    justifyContent: 'center',
  },
  featuresList: {
    marginVertical: 40,
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.1)',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e0f2fe',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  buttonContainer: {
    marginBottom: 40,
    gap: 16,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButton: {
    marginVertical: 8,
  },
  secondaryButton: {
    marginVertical: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  legalText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
