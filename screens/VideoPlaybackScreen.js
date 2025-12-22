/**
 * VideoPlaybackScreen
 * Playback and review of recorded thank you video
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CustomFrameOverlay } from '../components/CustomFrameOverlay';
import { supabase } from '../supabaseClient';
import { getVideoUrl } from '../services/videoService';
import { getFrameForGift } from '../services/frameTemplateService';

export const VideoPlaybackScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const videoUri = route?.params?.videoUri;
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;
  const videoId = route?.params?.videoId;
  const viewOnly = route?.params?.viewOnly || false;
  const [frameTemplate, setFrameTemplate] = useState(route?.params?.frameTemplate || null);
  const [fetchedVideoUri, setFetchedVideoUri] = useState(videoUri);

  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load video from database if videoId is provided (rewatch mode)
  useEffect(() => {
    if (videoId && !videoUri) {
      loadVideoFromDatabase();
    }
  }, [videoId]);

  const loadVideoFromDatabase = async () => {
    try {
      setLoading(true);
      console.log('🎬 Loading video from database:', videoId);

      // Get video record
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*, gifts(event_id)')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;

      if (!videoData.video_url && !videoData.storage_path) {
        throw new Error('Video URL not found');
      }

      // Get fresh signed URL if storage_path exists
      let videoUrlToUse = videoData.video_url;
      if (videoData.storage_path || videoData.video_path) {
        const storagePath = videoData.storage_path || videoData.video_path;
        const { url: freshUrl, error: urlError } = await getVideoUrl(storagePath);
        if (!urlError && freshUrl) {
          videoUrlToUse = freshUrl;
        }
      }

      setFetchedVideoUri(videoUrlToUse);
      console.log('✅ Video loaded:', videoUrlToUse?.substring(0, 50));

      // Load frame template
      if (videoData.metadata?.frame_template_id) {
        const { data: frameData } = await supabase
          .from('frame_templates')
          .select('*')
          .eq('id', videoData.metadata.frame_template_id)
          .single();
        if (frameData) setFrameTemplate(frameData);
      } else if (videoData.gift_id) {
        const frameResult = await getFrameForGift(
          videoData.gift_id,
          videoData.child_id,
          videoData.gifts?.event_id,
          null
        );
        if (frameResult.success && frameResult.data) {
          setFrameTemplate(frameResult.data);
        }
      }
    } catch (error) {
      console.error('❌ Error loading video:', error);
      Alert.alert('Error', 'Failed to load video');
      navigation?.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const handleLoadComplete = (status) => {
    if (status.durationMillis) {
      setDuration(Math.floor(status.durationMillis / 1000));
    }
  };

  const handlePlaybackStatusUpdate = (status) => {
    if (status.isPlaying) {
      setPosition(Math.floor(status.positionMillis / 1000));
    }
  };

  const handleReRecord = () => {
    navigation?.goBack();
  };

  const handleProceed = () => {
    // Skip frame selection - kids add decorations, parents add frames later
    navigation?.navigate('VideoCustomization', {
      videoUri,
      giftId,
      giftName,
      frameTemplate, // Pass frameTemplate forward
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const secsStr = secs < 10 ? '0' + secs : secs;
    return mins + ':' + secsStr;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Review Your Video"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Video
            ref={videoRef}
            source={{ uri: fetchedVideoUri || videoUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            useNativeControls={false}
            onLoadComplete={handleLoadComplete}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            progressUpdateIntervalMillis={500}
          />

          {/* Frame Overlay */}
          {frameTemplate && (
            <CustomFrameOverlay frameTemplate={frameTemplate} />
          )}

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
      </View>

      <View
        style={{
          backgroundColor: theme.neutralColors.white,
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        <View style={{ marginBottom: theme.spacing.md }}>
          <View
            style={{
              height: 4,
              backgroundColor: theme.neutralColors.lightGray,
              borderRadius: 2,
              overflow: 'hidden',
              marginBottom: theme.spacing.sm,
            }}
          >
            <View
              style={{
                height: '100%',
                width: duration > 0 ? (position / duration) * 100 + '%' : '0%',
                backgroundColor: theme.brandColors.coral,
              }}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                color: theme.neutralColors.mediumGray,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              }}
            >
              {formatTime(position)}
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                color: theme.neutralColors.mediumGray,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
              }}
            >
              {formatTime(duration)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handlePlayPause}
          style={{
            backgroundColor: isPlaying ? theme.semanticColors.error : theme.brandColors.coral,
            paddingVertical: theme.spacing.md,
            borderRadius: 8,
            marginBottom: theme.spacing.md,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            minHeight: 48,
          }}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              fontWeight: '600',
            }}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Text>
        </TouchableOpacity>

        {/* Action buttons - hide when viewing only */}
        {!viewOnly ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: theme.spacing.sm,
            }}
          >
            <TouchableOpacity
              onPress={handleReRecord}
              style={{
                backgroundColor: theme.brandColors.teal,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: 8,
                minHeight: 44,
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  fontWeight: '600',
                }}
              >
                Re-Record
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleProceed}
              style={{
                backgroundColor: theme.brandColors.coral,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: 8,
                minHeight: 44,
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  fontWeight: '600',
                }}
              >
                Add Stickers
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={{
              backgroundColor: theme.brandColors.coral,
              paddingVertical: theme.spacing.md,
              borderRadius: 8,
              minHeight: 48,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: isKidsEdition ? 16 : 14,
                fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                fontWeight: '600',
              }}
            >
              Done
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <LoadingSpinner visible={loading} message="Processing..." fullScreen />
    </SafeAreaView>
  );
};

export default VideoPlaybackScreen;
