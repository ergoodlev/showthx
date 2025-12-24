/**
 * SendSuccessScreen
 * Confirmation after successfully sending videos to guests
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';
import { ThankCastButton } from '../components/ThankCastButton';

export const SendSuccessScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const giftName = route?.params?.giftName;
  const guestCount = route?.params?.guestCount;

  const scaleAnim = useState(new Animated.Value(0))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Animate check mark icon
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBackToDashboard = () => {
    navigation?.navigate('ParentDashboard');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.xl,
        }}
      >
        {/* Success Animation */}
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            marginBottom: theme.spacing.xl,
          }}
        >
          <View
            style={{
              width: isKidsEdition ? 120 : 100,
              height: isKidsEdition ? 120 : 100,
              borderRadius: isKidsEdition ? 60 : 50,
              backgroundColor: theme.brandColors.teal,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="checkmark" size={isKidsEdition ? 60 : 50} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* Main Message */}
        <Text
          style={{
            fontSize: isKidsEdition ? 28 : 24,
            fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
            color: theme.neutralColors.dark,
            textAlign: 'center',
            marginBottom: theme.spacing.md,
            fontWeight: '700',
          }}
        >
          Sent!
        </Text>

        <Text
          style={{
            fontSize: isKidsEdition ? 18 : 16,
            fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
            color: theme.neutralColors.mediumGray,
            textAlign: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          {guestCount} guest{guestCount !== 1 ? 's' : ''} received the thank you video for {giftName}
        </Text>

        {/* Info Section */}
        <View
          style={{
            backgroundColor: theme.neutralColors.lightGray,
            borderRadius: 12,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.xl,
            width: '100%',
          }}
        >
          <View style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <Ionicons name="mail-open" size={20} color={theme.brandColors.teal} />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginLeft: theme.spacing.sm,
                  flex: 1,
                }}
              >
                Emails sent successfully
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <Ionicons name="eye-outline" size={20} color={theme.brandColors.coral} />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginLeft: theme.spacing.sm,
                  flex: 1,
                }}
              >
                Guests can watch their video
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="share-social" size={20} color={theme.brandColors.teal} />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginLeft: theme.spacing.sm,
                  flex: 1,
                }}
              >
                Video link expires in 30 days
              </Text>
            </View>
          </View>
        </View>

        {/* Action Text */}
        <Text
          style={{
            fontSize: isKidsEdition ? 14 : 12,
            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            color: theme.neutralColors.mediumGray,
            textAlign: 'center',
          }}
        >
          You can view all sent videos and event details from your dashboard.
        </Text>
      </ScrollView>

      {/* Action Buttons */}
      <View
        style={{
          backgroundColor: theme.neutralColors.white,
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.neutralColors.lightGray,
        }}
      >
        <ThankCastButton
          title="Back to Dashboard"
          onPress={handleBackToDashboard}
          style={{ marginBottom: theme.spacing.md }}
        />
      </View>
    </SafeAreaView>
  );
};

export default SendSuccessScreen;
