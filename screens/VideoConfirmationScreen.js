/**
 * VideoConfirmationScreen
 * Final review of customized video before submission
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import { supabase } from '../supabaseClient';

export const VideoConfirmationScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const videoUri = route?.params?.videoUri;
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;
  const musicId = route?.params?.musicId;
  const musicTitle = route?.params?.musicTitle;
  const transition = route?.params?.transition;
  const overlayText = route?.params?.overlayText;
  const textColor = route?.params?.textColor;
  const textPosition = route?.params?.textPosition;

  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      console.log('📹 Submitting video for gift:', giftName);

      // Get kid session info
      const kidSessionId = await AsyncStorage.getItem('kidSessionId');
      const parentId = await AsyncStorage.getItem('parentId');

      if (!kidSessionId) {
        throw new Error('Kid session not found');
      }

      // Create video record in database with pending_approval status
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert({
          child_id: kidSessionId,
          gift_id: giftId,
          parent_id: parentId,
          status: 'pending_approval',
          recorded_at: new Date().toISOString(),
          metadata: {
            music_id: musicId,
            customization: {
              text: overlayText,
              textColor,
              textPosition,
              transition,
            },
          },
        })
        .select()
        .single();

      if (videoError) {
        console.error('❌ Error creating video record:', videoError);
        throw videoError;
      }

      console.log('✅ Video record created:', videoData);

      // Update gift status to show video is pending approval
      const { error: giftError } = await supabase
        .from('gifts')
        .update({
          status: 'pending_approval',
          recorded_at: new Date().toISOString(),
        })
        .eq('id', giftId);

      if (giftError) {
        console.error('❌ Error updating gift:', giftError);
        throw giftError;
      }

      console.log('✅ Gift status updated to pending_approval');

      // Navigate to success screen
      navigation?.navigate('VideoSuccess', {
        giftId,
        giftName,
        videoId: videoData.id,
      });
    } catch (error) {
      console.error('❌ Error submitting video:', error);
      alert('Error submitting video: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Review Your Video"
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

        {/* Summary Section */}
        <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 18 : 16,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.md,
            }}
          >
            Video Summary
          </Text>

          {/* Gift Info */}
          <View
            style={{
              backgroundColor: theme.neutralColors.lightGray,
              borderRadius: 8,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <Ionicons name="gift" size={20} color={theme.brandColors.coral} />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                  marginLeft: theme.spacing.sm,
                }}
              >
                For
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 16 : 14,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginLeft: theme.spacing.sm,
                  flex: 1,
                }}
              >
                {giftName}
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
                marginBottom: theme.spacing.md,
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
                  Music
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

          {/* Customization Info */}
          {(overlayText || transition !== 'none') && (
            <View
              style={{
                backgroundColor: theme.neutralColors.lightGray,
                borderRadius: 8,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
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
                Customizations
              </Text>

              {overlayText && (
                <View style={{ marginBottom: theme.spacing.sm }}>
                  <Text
                    style={{
                      fontSize: isKidsEdition ? 12 : 11,
                      fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                      color: theme.neutralColors.mediumGray,
                    }}
                  >
                    Text
                  </Text>
                  <Text
                    style={{
                      fontSize: isKidsEdition ? 13 : 11,
                      fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                      color: theme.neutralColors.dark,
                      marginTop: 2,
                    }}
                  >
                    "{overlayText}"
                  </Text>
                </View>
              )}

              {transition !== 'none' && (
                <View>
                  <Text
                    style={{
                      fontSize: isKidsEdition ? 12 : 11,
                      fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                      color: theme.neutralColors.mediumGray,
                    }}
                  >
                    Transition
                  </Text>
                  <Text
                    style={{
                      fontSize: isKidsEdition ? 13 : 11,
                      fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                      color: theme.neutralColors.dark,
                      marginTop: 2,
                      textTransform: 'capitalize',
                    }}
                  >
                    {transition}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Info Box */}
          <View
            style={{
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              borderRadius: 8,
              padding: theme.spacing.md,
              flexDirection: 'row',
              gap: theme.spacing.sm,
            }}
          >
            <Ionicons name="information-circle" size={20} color={theme.brandColors.coral} />
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                flex: 1,
              }}
            >
              Once submitted, your parent will review the video before sharing it with guests.
            </Text>
          </View>
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
        <ThankCastButton
          title="Submit Video"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
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
      </View>

      <LoadingSpinner visible={loading} message="Submitting your video..." fullScreen />
    </SafeAreaView>
  );
};

export default VideoConfirmationScreen;
