/**
 * VideoSuccessScreen
 * Celebration screen after successful video submission
 */

import React, { useState, useEffect } from 'react';
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

export const VideoSuccessScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;

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

  const handleContinue = () => {
    navigation?.navigate('KidPendingGifts');
  };

  const handleViewMore = () => {
    navigation?.navigate('KidDashboard');
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
              backgroundColor: theme.brandColors.coral,
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
          Thank You!
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
          Your video for {giftName} has been submitted!
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <Ionicons name="checkmark-circle" size={20} color={theme.brandColors.coral} />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginLeft: theme.spacing.sm,
                  flex: 1,
                }}
              >
                Video recorded and customized
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <Ionicons name="eye" size={20} color={theme.brandColors.teal} />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginLeft: theme.spacing.sm,
                  flex: 1,
                }}
              >
                Waiting for parent approval
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="mail" size={20} color={theme.brandColors.coral} />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginLeft: theme.spacing.sm,
                  flex: 1,
                }}
              >
                Will be shared with guests soon
              </Text>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View
          style={{
            backgroundColor: 'rgba(255, 107, 107, 0.05)',
            borderLeftWidth: 4,
            borderLeftColor: theme.brandColors.coral,
            borderRadius: 8,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.xl,
            width: '100%',
          }}
        >
          <Text
            style={{
              fontSize: isKidsEdition ? 14 : 12,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.sm,
            }}
          >
            What Happens Next?
          </Text>
          <Text
            style={{
              fontSize: isKidsEdition ? 13 : 11,
              fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              color: theme.neutralColors.mediumGray,
              lineHeight: 20,
            }}
          >
            Your parent will review your video and approve it before it gets shared with the guests. They can make changes if needed.
          </Text>
        </View>

        {/* Action Text */}
        <Text
          style={{
            fontSize: isKidsEdition ? 14 : 12,
            fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
            color: theme.neutralColors.mediumGray,
            textAlign: 'center',
            marginBottom: theme.spacing.xl,
          }}
        >
          Great job! You can record another video or check back soon to see if there are more gifts to record.
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
          title="Back to My Gifts"
          onPress={handleContinue}
          style={{ marginBottom: theme.spacing.md }}
        />
        <TouchableOpacity
          onPress={handleViewMore}
          style={{
            paddingVertical: theme.spacing.md,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: isKidsEdition ? 14 : 12,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.brandColors.teal,
            }}
          >
            View Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default VideoSuccessScreen;
