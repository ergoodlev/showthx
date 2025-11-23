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
import { uploadVideo, validateVideo } from '../services/videoService';

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
  const textPosX = route?.params?.textPosX;
  const textPosY = route?.params?.textPosY;
  const frame = route?.params?.frame;

  const TEXT_COLORS = {
    white: '#FFFFFF',
    black: '#000000',
    coral: '#FF6B6B',
    teal: '#00A699',
    yellow: '#FFD93D',
  };

  // Render frame overlay based on selection
  const renderFrameOverlay = () => {
    if (!frame || frame === 'none') return null;

    switch (frame) {
      case 'gradient-glow':
        return (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, backgroundColor: 'rgba(255,107,107,0.4)' }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, backgroundColor: 'rgba(255,217,61,0.4)' }} />
            <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 8, backgroundColor: 'rgba(255,107,107,0.6)' }} />
            <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 8, backgroundColor: 'rgba(255,217,61,0.6)' }} />
          </View>
        );
      case 'neon-border':
        return (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 4, borderColor: '#00F5FF', borderRadius: 12, pointerEvents: 'none', shadowColor: '#00F5FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10 }} />
        );
      case 'soft-vignette':
        return (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50, backgroundColor: 'rgba(0,0,0,0.5)' }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </View>
        );
      case 'celebration':
        return (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
            <View style={{ position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFD700' }} />
            <View style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FF6B6B' }} />
            <View style={{ position: 'absolute', bottom: 8, left: 20, width: 14, height: 14, borderRadius: 7, backgroundColor: '#FF6B6B' }} />
            <View style={{ position: 'absolute', bottom: 12, right: 16, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFD700' }} />
            <View style={{ position: 'absolute', top: 40, right: 30, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFD700' }} />
          </View>
        );
      case 'minimal':
        return (
          <View style={{ position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 8, pointerEvents: 'none' }} />
        );
      default:
        return null;
    }
  };

  // Render text overlay
  const renderTextOverlay = () => {
    if (!overlayText) return null;

    // Handle custom position (draggable)
    if (textPosition === 'custom' && textPosX !== undefined && textPosY !== undefined) {
      return (
        <View
          style={{
            position: 'absolute',
            left: `${textPosX}%`,
            top: `${textPosY}%`,
            transform: [{ translateX: -50 }, { translateY: -50 }],
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{
              fontSize: isKidsEdition ? 20 : 16,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              color: TEXT_COLORS[textColor] || '#FFFFFF',
              textAlign: 'center',
              paddingHorizontal: 16,
              paddingVertical: 4,
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 4,
              overflow: 'hidden',
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {overlayText}
          </Text>
        </View>
      );
    }

    // Handle preset positions
    return (
      <View
        style={{
          position: 'absolute',
          top: textPosition === 'top' ? 12 : textPosition === 'middle' ? '40%' : undefined,
          bottom: textPosition === 'bottom' ? 12 : undefined,
          left: 0,
          right: 0,
          alignItems: 'center',
          paddingHorizontal: 16,
        }}
      >
        <Text
          style={{
            fontSize: isKidsEdition ? 20 : 16,
            fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
            color: TEXT_COLORS[textColor] || '#FFFFFF',
            textAlign: 'center',
            paddingHorizontal: 16,
            paddingVertical: 4,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 4,
            overflow: 'hidden',
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 3,
          }}
        >
          {overlayText}
        </Text>
      </View>
    );
  };

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
        throw new Error('Kid session not found. Please log in again.');
      }

      if (!parentId) {
        throw new Error('Parent ID not found. Please log in again.');
      }

      // Step 1: Validate video file exists
      console.log('📋 Validating video file...');
      const validation = await validateVideo(videoUri);
      if (!validation.valid) {
        throw new Error(validation.error || 'Video file is invalid');
      }
      console.log('✅ Video validated, size:', Math.round(validation.size / 1024), 'KB');

      // Step 2: Upload video to Supabase Storage
      console.log('📤 Uploading video to storage...');
      const uploadResult = await uploadVideo(videoUri, giftId, parentId);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload video');
      }
      console.log('✅ Video uploaded:', uploadResult.url);

      // Step 3: Create video record in database with pending_approval status
      console.log('💾 Creating database record...');
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert({
          child_id: kidSessionId,
          gift_id: giftId,
          parent_id: parentId,
          status: 'pending_approval',
          video_url: uploadResult.url,
          storage_path: uploadResult.path,
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

      // Step 4: Update gift status to show video is pending approval
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
        {/* Video Preview - Portrait aspect ratio for vertical videos */}
        <View
          style={{
            backgroundColor: '#000000',
            aspectRatio: 9 / 16,
            maxHeight: 400,
            alignSelf: 'center',
            width: '65%',
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

          {/* Frame Overlay */}
          {renderFrameOverlay()}

          {/* Text Overlay */}
          {renderTextOverlay()}

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
