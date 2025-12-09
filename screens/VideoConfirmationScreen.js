/**
 * VideoConfirmationScreen
 * Final review of video before submission - simplified
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import LottieView from 'lottie-react-native';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import { CustomFrameOverlay } from '../components/CustomFrameOverlay';
import { supabase } from '../supabaseClient';
import { uploadVideo, validateVideo } from '../services/videoService';

export const VideoConfirmationScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const videoUri = route?.params?.videoUri;
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;
  const decorations = route?.params?.decorations || [];
  const frameTemplate = route?.params?.frameTemplate || null;

  // Render frame overlay
  const renderFrameOverlay = () => {
    if (!frameTemplate) return null;

    const customText = frameTemplate.custom_text || '';
    const textPosition = frameTemplate.custom_text_position || 'bottom';
    const textColor = frameTemplate.custom_text_color || '#FFFFFF';

    return (
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        {/* Custom Frame Border */}
        <CustomFrameOverlay frameTemplate={frameTemplate} />

        {/* Parent's Custom Text */}
        {customText && (
          <View
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              [textPosition === 'top' ? 'top' : 'bottom']: textPosition === 'top' ? 20 : 70,
              alignItems: 'center',
            }}
          >
            <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
              <Text
                style={{
                  color: textColor,
                  fontSize: 16,
                  fontWeight: '600',
                  textAlign: 'center',
                  textShadowColor: 'rgba(0,0,0,0.8)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {customText}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render decoration overlays
  const renderDecorations = () => {
    if (!decorations || decorations.length === 0) return null;

    return decorations.map(decoration => {
      // Defensive checks to prevent NaN errors
      const x = typeof decoration.x === 'number' && !isNaN(decoration.x) ? decoration.x : 50;
      const y = typeof decoration.y === 'number' && !isNaN(decoration.y) ? decoration.y : 50;
      const scale = typeof decoration.scale === 'number' && !isNaN(decoration.scale) ? decoration.scale : 1;

      return (
        <View
          key={decoration.id}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            transform: [
              { translateX: -20 },
              { translateY: -20 },
              { scale: scale },
            ],
          }}
        >
        {decoration.lottieSource ? (
          <LottieView
            source={decoration.lottieSource}
            autoPlay
            loop
            style={{ width: 40, height: 40 }}
          />
        ) : (
          <Text
            style={{
              fontSize: 40,
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {decoration.emoji}
          </Text>
        )}
        </View>
      );
    });
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

      // Step 3: Create video record using secure function (bypasses RLS for kid submissions)
      console.log('💾 Creating database record via secure function...');

      // Build metadata object with decorations and frame info
      const metadata = {
        decorations: decorations,
      };

      // Add frame template ID if present
      if (frameTemplate && frameTemplate.id) {
        metadata.frame_template_id = frameTemplate.id;
        console.log('🖼️  Saving frame template ID:', frameTemplate.id);
      }

      const { data: videoId, error: videoError } = await supabase
        .rpc('submit_video_from_kid', {
          p_child_id: kidSessionId,
          p_gift_id: giftId,
          p_parent_id: parentId,
          p_video_url: uploadResult.url,
          p_metadata: metadata,
        });

      if (videoError) {
        console.error('❌ Error creating video record:', videoError);
        // Provide user-friendly error message
        if (videoError.message?.includes('child does not belong')) {
          throw new Error('Session expired. Please log in again.');
        } else if (videoError.message?.includes('gift does not belong')) {
          throw new Error('This gift is not available. Please go back and try again.');
        }
        throw videoError;
      }

      console.log('✅ Video record created with ID:', videoId);

      // Gift status is automatically updated by the secure function
      console.log('✅ Gift status updated to pending_approval');

      // Create videoData object for navigation
      const videoData = { id: videoId };

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

          {/* Decoration Overlays */}
          {renderDecorations()}

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

          {/* Decorations Info */}
          {decorations && decorations.length > 0 && (
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
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                }}
              >
                Stickers Added
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {decorations.map(decoration => (
                  <Text key={decoration.id} style={{ fontSize: 20 }}>
                    {decoration.emoji}
                  </Text>
                ))}
              </View>
              <Text
                style={{
                  fontSize: isKidsEdition ? 13 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginTop: 4,
                }}
              >
                {decorations.length} sticker{decorations.length !== 1 ? 's' : ''}
              </Text>
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
