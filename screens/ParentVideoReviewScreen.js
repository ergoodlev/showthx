/**
 * ParentVideoReviewScreen
 * Review and approve/request changes to recorded thank you videos
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useEdition } from '../context/EditionContext';
import { useDataSync } from '../context/DataSyncContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import { CustomFrameOverlay } from '../components/CustomFrameOverlay';
import { supabase } from '../supabaseClient';
import { getFrameForGift } from '../services/frameTemplateService';
import { getVideoUrl } from '../services/videoService';
import { getFilterById } from '../services/videoFilterService';

/**
 * Filter Preview Overlay - Visual approximation of filters
 */
const FilterPreviewOverlay = ({ filterId }) => {
  if (!filterId) return null;

  const filter = getFilterById(filterId);
  if (!filter) return null;

  switch (filterId) {
    case 'warm':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 165, 0, 0.15)' }]} />
        </View>
      );
    case 'cool':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(100, 149, 237, 0.18)' }]} />
        </View>
      );
    case 'vintage':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(210, 180, 140, 0.2)' }]} />
        </View>
      );
    case 'sepia':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(112, 66, 20, 0.3)' }]} />
        </View>
      );
    case 'bw':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(128, 128, 128, 0.6)' }]} />
        </View>
      );
    case 'vignette':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.3 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      );
    case 'bright':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.12)' }]} />
        </View>
      );
    case 'vivid':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 0, 100, 0.05)' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 200, 255, 0.05)' }]} />
        </View>
      );
    case 'pop':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.08)' }]} />
        </View>
      );
    case 'dreamy':
      return (
        <View style={[StyleSheet.absoluteFill, filterStyles.overlay]} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 182, 193, 0.15)' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
        </View>
      );
    default:
      return null;
  }
};

const filterStyles = StyleSheet.create({
  overlay: {
    zIndex: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export const ParentVideoReviewScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const { notifyVideoStatusChanged, notifyVideoDeleted } = useDataSync();
  const isKidsEdition = edition === 'kids';
  const videoId = route?.params?.videoId;
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;
  const kidName = route?.params?.kidName;
  const videoUri = route?.params?.videoUri;
  const musicTitle = route?.params?.musicTitle;

  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [fetchedVideoUri, setFetchedVideoUri] = useState(videoUri);
  const [fetchedGiftId, setFetchedGiftId] = useState(giftId);
  const [fetchedGiftName, setFetchedGiftName] = useState(giftName);
  const [fetchedKidName, setFetchedKidName] = useState(kidName);
  const [fetchedMusicTitle, setFetchedMusicTitle] = useState(musicTitle);
  const [frameTemplate, setFrameTemplate] = useState(null);
  const [decorations, setDecorations] = useState([]); // Stickers added by kid
  const [videoFilter, setVideoFilter] = useState(null); // Filter applied by kid
  const [isPlaying, setIsPlaying] = useState(false);
  const [action, setAction] = useState(null); // 'approve' or 'request-changes'
  const [feedback, setFeedback] = useState('');

  // Load video details if only videoId is provided
  useFocusEffect(
    React.useCallback(() => {
      if (videoId && !giftId) {
        loadVideoDetails();
      } else {
        setLoading(false);
      }
    }, [videoId, giftId])
  );

  const loadVideoDetails = async () => {
    try {
      setLoading(true);
      console.log('📹 Loading video details for:', videoId);

      // Get video record
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;

      // CRITICAL: Check if video_url exists
      if (!videoData.video_url) {
        console.error('❌ Video record found but video_url is null/empty:', videoData);
        throw new Error('Video URL is missing from the database. Please try re-recording the video.');
      }

      console.log('✅ Video URL loaded:', videoData.video_url);

      // Get gift details
      const { data: giftData, error: giftError } = await supabase
        .from('gifts')
        .select('id, name, giver_name, event_id')
        .eq('id', videoData.gift_id)
        .single();

      if (giftError) throw giftError;

      // Get child name
      const { data: childData, error: childError } = await supabase
        .from('children')
        .select('id, name')
        .eq('id', videoData.child_id)
        .single();

      if (childError) throw childError;

      // Load frame template for this video
      console.log('🖼️  Loading frame template for video');
      console.log('📋 Video metadata:', videoData.metadata);

      // Try to get frame template ID from video metadata first
      let frameData = null;
      if (videoData.metadata?.frame_template_id) {
        console.log('🖼️  Found frame template ID in metadata:', videoData.metadata.frame_template_id);
        const { data: frameFromMetadata, error: frameMetadataError } = await supabase
          .from('frame_templates')
          .select('*')
          .eq('id', videoData.metadata.frame_template_id)
          .maybeSingle();

        if (!frameMetadataError && frameFromMetadata) {
          frameData = frameFromMetadata;
          console.log('✅ Loaded frame from metadata:', frameData.name);
        }
      }

      // If no frame in metadata, look up via assignments
      if (!frameData) {
        console.log('🖼️  Looking up frame via assignments');
        const frameResult = await getFrameForGift(
          videoData.gift_id,
          videoData.child_id,
          giftData.event_id,
          null
        );

        if (frameResult.success && frameResult.data) {
          frameData = frameResult.data;
          console.log('✅ Frame template loaded via assignment:', frameData.name);
        }
      }

      if (frameData) {
        setFrameTemplate(frameData);
      } else {
        console.log('ℹ️  No frame template found for this video');
      }

      console.log('✅ Loaded video details - Gift:', giftData.name, 'Kid:', childData.name);
      setFetchedGiftId(videoData.gift_id);
      setFetchedGiftName(giftData.name);
      setFetchedKidName(childData.name);

      // Regenerate signed URL if storage_path exists (for fresh, unexpired URL)
      // Otherwise fall back to stored video_url
      let videoUrlToUse = videoData.video_url;

      if (videoData.storage_path || videoData.video_path) {
        console.log('🔄 Regenerating signed URL for video playback');
        const storagePath = videoData.storage_path || videoData.video_path;
        const { url: freshUrl, error: urlError } = await getVideoUrl(storagePath);

        if (!urlError && freshUrl) {
          console.log('✅ Fresh signed URL generated (expires in 24 hours)');
          videoUrlToUse = freshUrl;
        } else {
          console.warn('⚠️ Failed to generate fresh URL, using stored URL:', urlError);
        }
      } else {
        console.log('ℹ️  No storage path found, using stored video_url');
      }

      setFetchedVideoUri(videoUrlToUse);
      setFetchedMusicTitle(videoData.metadata?.music_id || null);

      // Load decorations (stickers) from metadata
      if (videoData.metadata?.decorations && Array.isArray(videoData.metadata.decorations)) {
        setDecorations(videoData.metadata.decorations);
        console.log('🎨 Loaded decorations from video metadata:', videoData.metadata.decorations.length);
      }

      // Load video filter from metadata
      if (videoData.metadata?.video_filter) {
        setVideoFilter(videoData.metadata.video_filter);
        console.log('🎬 Loaded video filter from metadata:', videoData.metadata.video_filter);
      }
    } catch (error) {
      console.error('❌ Error loading video details:', error);
      Alert.alert('Error', error.message || 'Failed to load video details');
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

  // Render decorations (stickers) added by kid
  const renderDecorations = () => {
    if (!decorations || decorations.length === 0) return null;

    return (
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        {decorations.map((decoration, index) => (
          <View
            key={`decoration-${index}-${decoration.id || index}`}
            style={{
              position: 'absolute',
              left: `${decoration.x ?? decoration.position?.x ?? 50}%`,
              top: `${decoration.y ?? decoration.position?.y ?? 50}%`,
              transform: [
                { translateX: -20 }, // Center the sticker
                { translateY: -20 },
                { scale: decoration.scale || 1 },
                { rotate: `${decoration.rotation || 0}deg` },
              ],
            }}
          >
            <Text style={{ fontSize: decoration.size || 40 }}>
              {decoration.emoji || decoration.sticker || '⭐'}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Render frame overlay
  const renderFrameOverlay = () => {
    const hasFrame = frameTemplate !== null;
    const hasDecorations = decorations && decorations.length > 0;

    // Return null only if nothing to render
    if (!hasFrame && !hasDecorations) return null;

    const customText = frameTemplate?.custom_text || '';
    const textPosition = frameTemplate?.custom_text_position || 'bottom';
    const textColor = frameTemplate?.custom_text_color || '#FFFFFF';

    return (
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        {/* Custom Frame Border */}
        {hasFrame && <CustomFrameOverlay frameTemplate={frameTemplate} />}

        {/* Kid's Stickers/Decorations */}
        {renderDecorations()}

        {/* Parent's Custom Text */}
        {customText && (
          <View
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              [textPosition === 'top' ? 'top' : 'bottom']: textPosition === 'top' ? '3%' : '8%',
              alignItems: 'center',
              zIndex: 100,
            }}
          >
            <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, maxWidth: '90%' }}>
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
                numberOfLines={3}
              >
                {customText}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      console.log('✅ Approving video:', videoId);
      console.log('📋 Gift ID:', fetchedGiftId);
      console.log('📋 Video URI:', fetchedVideoUri);

      // CRITICAL: Verify video URL exists before approving
      if (!fetchedVideoUri) {
        console.error('❌ Cannot approve - video URL is missing');
        Alert.alert('Error', 'Video URL is missing. Please try re-loading this screen or re-recording the video.');
        setLoading(false);
        return;
      }

      if (!fetchedGiftId) {
        console.error('❌ Cannot approve - gift ID is missing');
        Alert.alert('Error', 'Gift ID is missing. Please try re-loading this screen.');
        setLoading(false);
        return;
      }

      console.log('📋 Approving with video URL:', fetchedVideoUri);

      // Update video status to 'approved'
      console.log('📝 Updating video table with ID:', videoId);
      const { data: videoUpdateData, error: videoError } = await supabase
        .from('videos')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', videoId)
        .select();

      if (videoError) {
        console.error('❌ Error approving video in videos table:', videoError);
        console.error('Error code:', videoError.code);
        console.error('Error message:', videoError.message);
        console.error('Error hint:', videoError.hint);
        console.error('Error details:', videoError.details);
        Alert.alert(
          'Approval Error',
          `Failed to approve video.\n\nError: ${videoError.message}\nCode: ${videoError.code}\n\nThis might be a permissions issue. Check Supabase RLS policies for the videos table.`
        );
        setLoading(false);
        return;
      }

      console.log('✅ Video status updated:', videoUpdateData);

      // Update gift status to 'approved'
      // Note: video_url is stored in videos table, not gifts table
      console.log('📝 Updating gift table with ID:', fetchedGiftId);
      const { data: giftUpdateData, error: giftError } = await supabase
        .from('gifts')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', fetchedGiftId)
        .select();

      if (giftError) {
        console.error('❌ Error updating gift in gifts table:', giftError);
        console.error('Error code:', giftError.code);
        console.error('Error message:', giftError.message);
        console.error('Error hint:', giftError.hint);
        console.error('Error details:', giftError.details);
        Alert.alert(
          'Gift Update Error',
          `Failed to update gift status.\n\nError: ${giftError.message}\nCode: ${giftError.code}\n\nThis might be a permissions issue. Check Supabase RLS policies for the gifts table.`
        );
        setLoading(false);
        return;
      }

      console.log('✅ Gift status updated:', giftUpdateData);
      console.log('✅ Video approved, navigating to share screen');

      // Notify context to sync data across screens
      await notifyVideoStatusChanged();

      // Navigate to send screen
      navigation?.navigate('SendToGuests', {
        giftId: fetchedGiftId,
        giftName: fetchedGiftName,
        videoUri: fetchedVideoUri, // Pass the fetched URI, not the route param
      });
    } catch (error) {
      console.error('❌ Error approving video:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Error', `Failed to approve video: ${error.message}`);
      setLoading(false);
    }
  };

  // COPPA Compliant: Allow parent to permanently delete video
  const handleDeleteVideo = async () => {
    Alert.alert(
      'Delete This Video?',
      'This will permanently delete this video. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log('🗑️ Deleting video:', videoId);

              // Get video details for storage path
              const { data: videoData, error: fetchError } = await supabase
                .from('videos')
                .select('video_url, storage_path, video_path')
                .eq('id', videoId)
                .single();

              if (fetchError) {
                console.error('Error fetching video for deletion:', fetchError);
              }

              // Try to delete from storage
              if (videoData) {
                const storagePath = videoData.storage_path || videoData.video_path;
                if (storagePath) {
                  try {
                    await supabase.storage.from('videos').remove([storagePath]);
                    console.log('✅ Storage file deleted');
                  } catch (storageErr) {
                    console.warn('Could not delete storage file:', storageErr.message);
                  }
                } else if (videoData.video_url) {
                  // Extract path from URL
                  try {
                    const urlParts = videoData.video_url.split('/videos/');
                    if (urlParts[1]) {
                      const pathFromUrl = urlParts[1].split('?')[0];
                      await supabase.storage.from('videos').remove([pathFromUrl]);
                      console.log('✅ Storage file deleted via URL extraction');
                    }
                  } catch (urlErr) {
                    console.warn('Could not extract/delete storage file from URL:', urlErr.message);
                  }
                }
              }

              // Delete video record from database
              const { error: deleteError } = await supabase
                .from('videos')
                .delete()
                .eq('id', videoId);

              if (deleteError) {
                console.error('Error deleting video record:', deleteError);
                throw deleteError;
              }

              // Update gift status back to pending
              if (fetchedGiftId) {
                await supabase
                  .from('gifts')
                  .update({ status: 'pending' })
                  .eq('id', fetchedGiftId);
              }

              console.log('✅ Video deleted successfully');

              // Notify context to sync data across screens
              await notifyVideoDeleted();

              Alert.alert('Video Deleted', 'The video has been permanently deleted.');
              navigation?.goBack();
            } catch (error) {
              console.error('Error deleting video:', error);
              Alert.alert('Error', 'Failed to delete video. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRequestChanges = async () => {
    try {
      if (!feedback.trim()) {
        Alert.alert('Validation', 'Please provide feedback for the child');
        return;
      }

      setLoading(true);
      console.log('🔄 Requesting changes for video:', videoId);
      console.log('📋 Gift ID:', fetchedGiftId);
      console.log('📝 Feedback:', feedback);

      // Update video status - store feedback in metadata to avoid column dependency
      // First get current metadata
      const { data: currentVideo, error: fetchError } = await supabase
        .from('videos')
        .select('metadata')
        .eq('id', videoId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching video metadata:', fetchError);
      }

      const currentMetadata = currentVideo?.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        parent_feedback: feedback,
        feedback_sent_at: new Date().toISOString(),
      };

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .update({
          status: 'needs_rerecord',
          metadata: updatedMetadata,
        })
        .eq('id', videoId)
        .select();

      if (videoError) {
        console.error('❌ Error updating video:', videoError);
        console.error('Error details:', JSON.stringify(videoError, null, 2));
        Alert.alert('Error', `Failed to send feedback: ${videoError.message || videoError.code}`);
        setLoading(false);
        return;
      }

      console.log('✅ Video status updated to needs_rerecord:', videoData);

      // Also update gift status (just status, not feedback columns which may not exist)
      const { data: giftData, error: giftError } = await supabase
        .from('gifts')
        .update({
          status: 'needs_rerecord',
        })
        .eq('id', fetchedGiftId)
        .select();

      if (giftError) {
        console.error('❌ Error updating gift:', giftError);
        console.error('Error details:', JSON.stringify(giftError, null, 2));
        // Don't block on gift update error - video was already updated
        console.warn('⚠️ Gift status update failed, but video was updated successfully');
      } else {
        console.log('✅ Gift status updated:', giftData);
      }

      // Notify context to sync data across screens
      await notifyVideoStatusChanged();

      // Show confirmation and go back
      Alert.alert('Feedback Sent', 'Your feedback has been sent to the child. They can re-record the video now.');
      navigation?.goBack();
    } catch (error) {
      console.error('❌ Error requesting changes:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Error', `Failed to send feedback: ${error.message}`);
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Video Preview - 9:16 aspect ratio for portrait video */}
        <View
          style={{
            backgroundColor: '#000000',
            aspectRatio: 9 / 16,
            maxHeight: 400,
            alignSelf: 'center',
            width: '100%',
            maxWidth: 225,
            justifyContent: 'center',
            alignItems: 'center',
            margin: theme.spacing.md,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {fetchedVideoUri ? (
            <Video
              ref={videoRef}
              source={{ uri: fetchedVideoUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              useNativeControls={false}
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded) {
                  setIsPlaying(status.isPlaying);
                  // If video finished, reset position to start for next play
                  if (status.didJustFinish) {
                    videoRef.current?.setPositionAsync(0);
                  }
                }
              }}
              onError={(error) => {
                console.error('❌ Video playback error:', error);
                console.error('❌ Error details:', JSON.stringify(error, null, 2));
                console.error('❌ Video URI being used:', fetchedVideoUri);
                console.error('❌ Is signed URL?', fetchedVideoUri?.includes('token=') ? 'YES (signed)' : 'NO (public)');

                // Show alert to user
                Alert.alert(
                  'Video Playback Error',
                  `Cannot play video. This may be due to expired URL or permission issues.\n\nError: ${error.error?.code || 'Unknown'}\n\nURL type: ${fetchedVideoUri?.includes('token=') ? 'Signed URL' : 'Public URL'}\n\nTry refreshing the screen.`,
                  [
                    { text: 'Refresh', onPress: () => loadVideoDetails() },
                    { text: 'OK' }
                  ]
                );
              }}
              onLoad={() => {
                console.log('✅ Video loaded successfully');
                console.log('✅ Video URI:', fetchedVideoUri);
                console.log('✅ Is signed URL?', fetchedVideoUri?.includes('token=') ? 'YES' : 'NO');
              }}
              shouldPlay={false}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14 }}>Loading video...</Text>
            </View>
          )}

          {/* Filter Preview Overlay */}
          <FilterPreviewOverlay filterId={videoFilter} />

          {/* Frame Overlay */}
          {renderFrameOverlay()}

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
                {fetchedGiftName}
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
                {fetchedKidName}
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

          {/* Delete Video Option - COPPA Parental Control */}
          <TouchableOpacity
            onPress={handleDeleteVideo}
            style={{
              backgroundColor: theme.neutralColors.white,
              borderColor: theme.semanticColors.error,
              borderWidth: 1,
              borderRadius: 8,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="trash-outline"
              size={24}
              color={theme.semanticColors.error}
            />
            <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: theme.semanticColors.error,
                }}
              >
                Delete Video
              </Text>
              <Text
                style={{
                  fontSize: isKidsEdition ? 12 : 11,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                  marginTop: 2,
                }}
              >
                Permanently remove this video
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
