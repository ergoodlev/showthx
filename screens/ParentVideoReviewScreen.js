/**
 * ParentVideoReviewScreen
 * Review and approve/request changes to recorded thank you videos
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import { supabase } from '../supabaseClient';

export const ParentVideoReviewScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const videoId = route?.params?.videoId;
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;
  const kidName = route?.params?.kidName;
  const videoUri = route?.params?.videoUri;
  const musicTitle = route?.params?.musicTitle;

  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [action, setAction] = useState(null); // 'approve' or 'request-changes'
  const [feedback, setFeedback] = useState('');

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const handleApprove = async () => {
    try {
      setLoading(true);

      // Update gift status to 'approved'
      const { error } = await supabase
        .from('gifts')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', giftId);

      if (error) {
        console.error('Error approving video:', error);
        return;
      }

      // Navigate to send screen
      navigation?.navigate('SendToGuests', {
        giftId,
        giftName,
        videoUri,
      });
    } catch (error) {
      console.error('Error approving video:', error);
      setLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    try {
      if (!feedback.trim()) {
        alert('Please provide feedback for the child');
        return;
      }

      setLoading(true);

      // Update gift status and add feedback
      const { error } = await supabase
        .from('gifts')
        .update({
          status: 'needs-rerecord',
          parent_feedback: feedback,
          feedback_sent_at: new Date().toISOString(),
        })
        .eq('id', giftId);

      if (error) {
        console.error('Error requesting changes:', error);
        return;
      }

      // Show confirmation and go back
      alert('Your feedback has been sent to the child. They can re-record the video now.');
      navigation?.goBack();
    } catch (error) {
      console.error('Error requesting changes:', error);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Review Video"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={{ flex: 1 }}>
        {/* Video Preview */}
        <View
          style={{
            backgroundColor: '#000000',
            height: 250,
            justifyContent: 'center',
            alignItems: 'center',
            margin: theme.spacing.md,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            useNativeControls={false}
            onPlaybackStatusUpdate={(status) => setIsPlaying(status.isPlaying)}
          />

          {!isPlaying && (
            <TouchableOpacity
              onPress={handlePlayPause}
              style={{
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(255, 107, 107, 0.9)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="play" size={40} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Video Info */}
        <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 18 : 16,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.md,
            }}
          >
            Thank You Video Details
          </Text>

          {/* Gift Info */}
          <View
            style={{
              backgroundColor: theme.neutralColors.lightGray,
              borderRadius: 8,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
              borderLeftWidth: 4,
              borderLeftColor: theme.brandColors.coral,
            }}
          >
            <View style={{ marginBottom: theme.spacing.sm }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                }}
              >
                For Gift
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginTop: 2,
                }}
              >
                {giftName}
              </Text>
            </View>

            <View>
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                }}
              >
                Recorded by
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginTop: 2,
                }}
              >
                {kidName}
              </Text>
            </View>
          </View>

          {/* Music Info */}
          {musicTitle && (
            <View
              style={{
                backgroundColor: theme.neutralColors.lightGray,
                borderRadius: 8,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="musical-notes" size={20} color={theme.brandColors.teal} />
              <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 12 : 11,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    color: theme.neutralColors.mediumGray,
                  }}
                >
                  Background Music
                </Text>
                <Text
                  style={{
                    fontSize: isKidsEdition ? 14 : 12,
                    fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                    color: theme.neutralColors.dark,
                    marginTop: 2,
                  }}
                >
                  {musicTitle}
                </Text>
              </View>
            </View>
          )}

          {/* Decision Section */}
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.md,
            }}
          >
            Your Decision
          </Text>

          {/* Approve Option */}
          <TouchableOpacity
            onPress={() => {
              setAction('approve');
              setFeedback('');
            }}
            style={{
              backgroundColor: action === 'approve' ? theme.brandColors.coral : theme.neutralColors.white,
              borderColor: action === 'approve' ? theme.brandColors.coral : theme.neutralColors.lightGray,
              borderWidth: 2,
              borderRadius: 8,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={action === 'approve' ? '#FFFFFF' : theme.brandColors.coral}
            />
            <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: action === 'approve' ? '#FFFFFF' : theme.neutralColors.dark,
                }}
              >
                Approve Video
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: action === 'approve' ? 'rgba(255,255,255,0.8)' : theme.neutralColors.mediumGray,
                  marginTop: 2,
                }}
              >
                Ready to share with guests
              </Text>
            </View>
          </TouchableOpacity>

          {/* Request Changes Option */}
          <TouchableOpacity
            onPress={() => {
              setAction('request-changes');
            }}
            style={{
              backgroundColor: action === 'request-changes' ? theme.brandColors.teal : theme.neutralColors.white,
              borderColor: action === 'request-changes' ? theme.brandColors.teal : theme.neutralColors.lightGray,
              borderWidth: 2,
              borderRadius: 8,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="create"
              size={24}
              color={action === 'request-changes' ? '#FFFFFF' : theme.brandColors.teal}
            />
            <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: action === 'request-changes' ? '#FFFFFF' : theme.neutralColors.dark,
                }}
              >
                Request Changes
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: action === 'request-changes' ? 'rgba(255,255,255,0.8)' : theme.neutralColors.mediumGray,
                  marginTop: 2,
                }}
              >
                Child can record again
              </Text>
            </View>
          </TouchableOpacity>

          {/* Feedback Input */}
          {action === 'request-changes' && (
            <View style={{ marginBottom: theme.spacing.lg }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.mediumGray,
                  marginBottom: theme.spacing.sm,
                }}
              >
                What feedback would you like to give?
              </Text>
              <TextInput
                placeholder="Be encouraging! Tell them what to try again..."
                value={feedback}
                onChangeText={setFeedback}
                style={{
                  borderWidth: 1,
                  borderColor: theme.neutralColors.lightGray,
                  borderRadius: 8,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.sm,
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.dark,
                  maxHeight: 100,
                }}
                multiline
                placeholderTextColor={theme.neutralColors.mediumGray}
              />
            </View>
          )}
        </View>
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
        {action === 'approve' && (
          <>
            <ThankCastButton
              title="Approve & Continue"
              onPress={handleApprove}
              loading={loading}
              disabled={loading}
              style={{ marginBottom: theme.spacing.md }}
            />
            <TouchableOpacity
              onPress={() => setAction(null)}
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
                Cancel
              </Text>
            </TouchableOpacity>
          </>
        )}
        {action === 'request-changes' && (
          <>
            <ThankCastButton
              title="Send Feedback"
              onPress={handleRequestChanges}
              loading={loading}
              disabled={loading || !feedback.trim()}
              style={{ marginBottom: theme.spacing.md }}
            />
            <TouchableOpacity
              onPress={() => setAction(null)}
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
                Cancel
              </Text>
            </TouchableOpacity>
          </>
        )}
        {!action && (
          <>
            <ThankCastButton
              title="Select an Option Above"
              onPress={() => {}}
              disabled={true}
              style={{ marginBottom: theme.spacing.md }}
            />
            <TouchableOpacity
              onPress={() => navigation?.goBack()}
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
                Back
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <LoadingSpinner visible={loading} message="Processing..." fullScreen />
    </SafeAreaView>
  );
};

export default ParentVideoReviewScreen;
