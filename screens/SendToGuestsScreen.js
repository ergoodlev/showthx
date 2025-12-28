/**
 * SendToGuestsScreen
 * Share approved thank you videos with guests via email
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThankCastButton } from '../components/ThankCastButton';
import { supabase } from '../supabaseClient';
import { sendVideoToGuests } from '../services/emailService';
import { updateGift } from '../services/databaseService';
import { createShortVideoUrl } from '../services/secureShareService';
import { prepareVideoForSharing, isCompositingAvailable } from '../services/videoCompositingService';
import { getFrameForGift } from '../services/frameTemplateService';
import * as FileSystem from 'expo-file-system/legacy';

export const SendToGuestsScreen = ({ navigation, route }) => {
  const { edition, theme } = useEdition();
  const isKidsEdition = edition === 'kids';
  const giftId = route?.params?.giftId;
  const giftName = route?.params?.giftName;
  const videoUri = route?.params?.videoUri;

  const [loading, setLoading] = useState(false);
  const [guests, setGuests] = useState([]);
  const [selectedGuests, setSelectedGuests] = useState(new Set());
  const [fetchingGuests, setFetchingGuests] = useState(true);
  const [sendMethod, setSendMethod] = useState('email'); // 'email' or 'share'
  const [videoUrl, setVideoUrl] = useState(videoUri); // Will be replaced with database URL
  const [videoId, setVideoId] = useState(null); // Video ID for short URL generation
  const [storagePath, setStoragePath] = useState(null); // Storage path for short URL
  const [parentId, setParentId] = useState(null); // Parent ID for share token
  const [frameTemplate, setFrameTemplate] = useState(null); // Frame overlay for compositing
  const [decorations, setDecorations] = useState([]); // Stickers for compositing
  const [videoFilter, setVideoFilter] = useState(null); // Video filter for compositing
  const [isRawVideo, setIsRawVideo] = useState(false); // Flag: needs compositing at send time
  const [loadingMessage, setLoadingMessage] = useState(''); // Progress message for compositing

  // Email template state (simplified - just subject and message)
  const [emailTemplate, setEmailTemplate] = useState({
    subject: 'A Thank You Video for You!',
    message: 'Someone special made a thank you video just for you!',
  });
  const [childName, setChildName] = useState('');
  const [parentName, setParentName] = useState('');
  const [eventId, setEventId] = useState(null);
  const [eventName, setEventName] = useState('');

  // Email editor state (for one-time edits before sending)
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);


  // Fetch video URL and assigned guest on mount
  useEffect(() => {
    const fetchVideoDataAndGuest = async () => {
      try {
        setFetchingGuests(true);

        console.log('📧 SendToGuests: Starting data fetch...');
        console.log('📧 Gift ID from route:', giftId);
        console.log('📧 Gift Name from route:', giftName);
        console.log('📧 Video URI from route:', videoUri);

        if (!giftId) {
          console.error('❌ No gift ID provided!');
          alert('Error: No gift ID provided. Please go back and try again.');
          setFetchingGuests(false);
          return;
        }

        // First, get the gift to find guest_id, parent_id, and event_id
        const { data: giftData, error: giftError } = await supabase
          .from('gifts')
          .select(`
            parent_id,
            guest_id,
            event_id,
            events:event_id (
              name,
              email_template_subject,
              email_template_greeting,
              email_template_message,
              email_template_gift_label,
              email_template_button_text,
              email_template_sign_off
            )
          `)
          .eq('id', giftId)
          .single();

        if (giftError) {
          console.error('❌ Error fetching gift:', giftError);
          throw giftError;
        }

        console.log('✅ Gift data loaded:', { parent_id: giftData?.parent_id, guest_id: giftData?.guest_id, event_id: giftData?.event_id });

        // Store parent ID for short URL generation
        if (giftData?.parent_id) {
          setParentId(giftData.parent_id);
        }

        if (!giftData) {
          console.warn('Gift not found');
          setGuests([]);
          setFetchingGuests(false);
          return;
        }

        // Set event info and load simplified email template
        if (giftData.events) {
          setEventId(giftData.event_id);
          setEventName(giftData.events.name || '');

          // Load simplified email template from event (just subject + message)
          const loadedSubject = giftData.events.email_template_subject || 'A Thank You Video for You!';
          const loadedMessage = giftData.events.email_template_message || 'Someone special made a thank you video just for you!';
          setEmailTemplate({
            subject: loadedSubject,
            message: loadedMessage,
          });
          // Also set editable versions (for one-time edits)
          setEditedSubject(loadedSubject);
          setEditedMessage(loadedMessage);
          console.log('✅ Loaded email template from event:', giftData.events.name);
        }

        // Get video URL and child info from videos table (videos are linked by gift_id)
        // First try approved videos, then fall back to any video for this gift
        let videoData = null;
        let videoError = null;

        // Get video for this gift - simplified query without foreign key join
        // (The children join was causing query failures in some cases)
        console.log('🔍 Looking for video with gift_id:', giftId);

        // Using .or() instead of .in() for better compatibility
        // Include metadata which contains decorations (stickers)
        const { data: approvedVideo, error: approvedError } = await supabase
          .from('videos')
          .select('id, video_url, storage_path, status, child_id, metadata')
          .eq('gift_id', giftId)
          .or('status.eq.approved,status.eq.sent')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('🔍 Video query result:', { data: approvedVideo, error: approvedError });

        if (approvedError) {
          console.error('❌ Error querying approved video:', approvedError);
          console.error('❌ Error details:', JSON.stringify(approvedError, null, 2));
        }

        if (approvedVideo) {
          videoData = approvedVideo;
          console.log('✅ Found video for gift:', { id: approvedVideo.id, status: approvedVideo.status });

          // Fetch child name separately (to avoid join issues)
          if (approvedVideo.child_id) {
            const { data: childData, error: childError } = await supabase
              .from('children')
              .select('name')
              .eq('id', approvedVideo.child_id)
              .maybeSingle();

            if (!childError && childData) {
              videoData.children = childData;
              console.log('✅ Loaded child name:', childData.name);
            } else {
              console.warn('⚠️ Could not load child name:', childError?.message);
            }
          }
        } else {
          // Log what videos exist for debugging
          const { data: allVideos } = await supabase
            .from('videos')
            .select('id, status, gift_id, created_at')
            .eq('gift_id', giftId);

          console.warn('⚠️ No approved/sent video found for this gift');
          console.log('📹 Gift ID being searched:', giftId);
          console.log('📹 All videos for this gift:', allVideos || 'none');

          // If there's a video but with different status, log it
          if (allVideos && allVideos.length > 0) {
            console.log('📹 Video statuses found:', allVideos.map(v => v.status));
          }
        }

        if (videoData) {
          console.log('📹 Video data found:', {
            id: videoData.id,
            status: videoData.status,
            has_video_url: !!videoData.video_url,
            has_storage_path: !!videoData.storage_path,
            child_id: videoData.child_id,
          });

          // Store video info for short URL generation
          setVideoId(videoData.id);
          if (videoData.storage_path) {
            setStoragePath(videoData.storage_path);
          }

          // Load decorations (stickers) from video metadata for compositing
          if (videoData.metadata?.decorations && Array.isArray(videoData.metadata.decorations)) {
            setDecorations(videoData.metadata.decorations);
            console.log('🎨 Loaded decorations for compositing:', videoData.metadata.decorations.length);
          }

          // Load video filter from metadata for compositing
          if (videoData.metadata?.video_filter) {
            setVideoFilter(videoData.metadata.video_filter);
            console.log('🎨 Loaded video filter for compositing:', videoData.metadata.video_filter);
          }

          // Check if this is a raw video that needs compositing at send time
          if (videoData.metadata?.raw_video === true) {
            setIsRawVideo(true);
            console.log('📹 Raw video detected - will composite at send time');
          }

          // Load frame template for compositing
          try {
            const frameResult = await getFrameForGift(giftId, videoData.child_id, giftData?.event_id);
            if (frameResult.success && frameResult.data) {
              setFrameTemplate(frameResult.data);
              console.log('🖼️ Loaded frame template for compositing:', frameResult.data.frame_shape);
            }
          } catch (frameError) {
            console.warn('⚠️ Could not load frame template:', frameError.message);
          }

          // Set child name for mail merge
          if (videoData.children) {
            setChildName(videoData.children.name || '');
            console.log('✅ Loaded child name for mail merge:', videoData.children.name);
          }

          // Try to get fresh signed URL if storage path exists
          if (videoData.storage_path) {
            console.log('🔄 Regenerating signed URL for sharing');
            const storagePath = videoData.storage_path;

            // Import getVideoUrl at top of file if not already imported
            const { data: signedUrlData, error: urlError } = await supabase.storage
              .from('videos')
              .createSignedUrl(storagePath, 86400); // 24 hours

            if (!urlError && signedUrlData) {
              setVideoUrl(signedUrlData.signedUrl);
              console.log('✅ Fresh signed URL generated for sharing');
            } else {
              setVideoUrl(videoData.video_url);
              console.log('⚠️ Using stored video URL (failed to generate fresh signed URL)');
            }
          } else {
            setVideoUrl(videoData.video_url);
            console.log('✅ Loaded video URL from videos table');
          }
        } else {
          console.warn('⚠️ No approved video found for this gift');
          // Show alert to user about missing video
          alert('No approved video found for this gift. The video may have been deleted or is still pending approval. Please go back and check the video status.');
        }

        // Get parent name for mail merge
        if (giftData.parent_id) {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            const { data: parentData } = await supabase
              .from('users')
              .select('name')
              .eq('id', userData.user.id)
              .single();

            if (parentData) {
              setParentName(parentData.name || '');
              console.log('✅ Loaded parent name for mail merge:', parentData.name);
            }
          }
        }

        // Only fetch the guest assigned to this gift
        if (giftData.guest_id) {
          const { data: guestData, error: guestError } = await supabase
            .from('guests')
            .select('*')
            .eq('id', giftData.guest_id)
            .single();

          if (guestError) throw guestError;

          console.log('✅ Loaded assigned guest:', guestData?.name || 'Unknown');
          setGuests(guestData ? [guestData] : []);
          // Auto-select the assigned guest
          if (guestData) {
            setSelectedGuests(new Set([guestData.id]));
          }
        } else {
          console.warn('No guest assigned to this gift');
          setGuests([]);
        }
      } catch (error) {
        console.error('Error fetching video data and guest:', error);
        setGuests([]);
      } finally {
        setFetchingGuests(false);
      }
    };

    fetchVideoDataAndGuest();
  }, [giftId]);

  const toggleGuestSelection = (guestId) => {
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId);
    } else {
      newSelected.add(guestId);
    }
    setSelectedGuests(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedGuests.size === guests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(guests.map(g => g.id)));
    }
  };

  /**
   * Download raw video and composite with current frame/decorations/filter
   * Then upload the composited video back to storage
   * @returns {Promise<{success: boolean, compositedUrl?: string, error?: string}>}
   */
  const compositeAndUploadVideo = async () => {
    try {
      setLoadingMessage('Downloading video...');
      console.log('📹 Starting delayed compositing for raw video...');

      // Get signed URL for download
      if (!storagePath) {
        throw new Error('No storage path available for raw video');
      }

      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('videos')
        .createSignedUrl(storagePath, 3600); // 1 hour for processing

      if (urlError || !signedUrlData?.signedUrl) {
        throw new Error('Could not get download URL for raw video');
      }

      // Download video to local cache
      const localPath = `${FileSystem.cacheDirectory}raw_video_${Date.now()}.mp4`;
      const downloadResult = await FileSystem.downloadAsync(signedUrlData.signedUrl, localPath);

      if (downloadResult.status !== 200) {
        throw new Error('Failed to download raw video');
      }

      console.log('✅ Raw video downloaded to:', localPath);

      // Composite the video with current frame, decorations, and filter
      setLoadingMessage('Adding frame and decorations...');
      console.log('🎨 Compositing with:', {
        hasFrame: !!frameTemplate,
        decorationCount: decorations.length,
        filter: videoFilter,
      });

      const canComposite = await isCompositingAvailable();
      if (!canComposite) {
        console.warn('⚠️ FFmpeg not available - sending raw video without overlays');
        // Clean up local file
        await FileSystem.deleteAsync(localPath, { idempotent: true });
        // Return with flag so caller can show warning to user
        return { success: true, compositedUrl: videoUrl, fallback: true, reason: 'FFmpeg not available' };
      }

      const compositeResult = await prepareVideoForSharing(localPath, {
        frameTemplate,
        stickers: decorations,
        videoFilter,
      });

      if (!compositeResult.success || !compositeResult.outputPath) {
        console.warn('⚠️ Compositing failed, using raw video');
        await FileSystem.deleteAsync(localPath, { idempotent: true });
        return { success: true, compositedUrl: videoUrl, fallback: true, reason: compositeResult.error || 'Compositing failed' };
      }

      console.log('✅ Video composited:', compositeResult.outputPath);

      // Upload composited video to storage
      setLoadingMessage('Uploading finalized video...');
      const compositedPath = `composited/${parentId}/${Date.now()}_composited.mp4`;

      // Read composited file
      const compositedBase64 = await FileSystem.readAsStringAsync(compositeResult.outputPath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert to bytes
      const binaryString = atob(compositedBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(compositedPath, bytes.buffer, {
          contentType: 'video/mp4',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ Composited video uploaded:', compositedPath);

      // Get signed URL for the composited video
      const { data: compositedUrlData, error: compositedUrlError } = await supabase.storage
        .from('videos')
        .createSignedUrl(compositedPath, 86400 * 30); // 30 days

      // Clean up local files
      await FileSystem.deleteAsync(localPath, { idempotent: true });
      await FileSystem.deleteAsync(compositeResult.outputPath, { idempotent: true });

      if (compositedUrlError || !compositedUrlData?.signedUrl) {
        throw new Error('Could not get URL for composited video');
      }

      console.log('✅ Composited video ready for sharing');
      return { success: true, compositedUrl: compositedUrlData.signedUrl, storagePath: compositedPath };
    } catch (error) {
      console.error('❌ Compositing error:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSendToGuests = async () => {
    if (selectedGuests.size === 0) {
      alert('Please select at least one guest');
      return;
    }

    if (!videoUrl) {
      alert('No video available to send. Please make sure the video has been approved first.');
      return;
    }

    try {
      setLoading(true);

      // DELAYED COMPOSITING: If this is a raw video, composite it now
      let finalVideoUrl = videoUrl;
      let finalStoragePath = storagePath;

      if (isRawVideo && storagePath) {
        console.log('📹 Raw video detected - compositing before send...');
        setLoadingMessage('Preparing your video...');

        const compositeResult = await compositeAndUploadVideo();

        if (compositeResult.success && compositeResult.compositedUrl) {
          if (compositeResult.fallback) {
            // Compositing fell back to raw video - warn user but continue
            console.warn('⚠️ Video will be sent without frame/stickers:', compositeResult.reason);
            alert(`Note: Your video will be sent without the frame and stickers. ${compositeResult.reason || 'Compositing is not available.'}\n\nThe video will still be sent successfully.`);
          } else {
            console.log('✅ Using composited video for sending');
          }
          finalVideoUrl = compositeResult.compositedUrl;
          if (compositeResult.storagePath) {
            finalStoragePath = compositeResult.storagePath;
          }
        } else if (!compositeResult.success) {
          console.error('❌ Compositing failed:', compositeResult.error);
          // Show error to user but continue with raw video
          alert(`Warning: Could not add frame and stickers to video. ${compositeResult.error || ''}\n\nThe raw video will be sent instead.`);
          console.log('⚠️ Falling back to raw video URL');
        }
      }

      const selectedGuestData = guests.filter(g => selectedGuests.has(g.id));

      if (sendMethod === 'email') {
        // Send via email with custom template and mail merge
        // Pass guest objects with email and name for personalization
        setLoadingMessage('Sending email...');
        const guestsWithNames = selectedGuestData.map(g => ({
          email: g.email,
          name: g.name || '',
        }));

        // Use edited values (which may have been customized by user for this send)
        const customizedTemplate = {
          subject: editedSubject || emailTemplate.subject,
          message: editedMessage || emailTemplate.message,
        };

        const emailResult = await sendVideoToGuests(
          guestsWithNames, // Pass guest objects with names
          giftName,
          finalVideoUrl, // Use composited video URL (or raw if compositing not needed/failed)
          '30 days',
          customizedTemplate, // Use the edited template
          childName, // Pass child name for mail merge
          parentName // Pass parent name for mail merge
        );

        if (!emailResult.success) {
          throw new Error(emailResult.error || 'Failed to send emails');
        }
      } else if (sendMethod === 'share') {
        // Video has already been composited if needed (see delayed compositing above)
        let shareUrl = finalVideoUrl;

        setLoadingMessage('Generating share link...');

        // Generate short URL if we have the required data
        if (videoId && parentId) {
          try {
            console.log('🔗 Generating short URL for sharing...');
            // Use finalStoragePath (composited) if available, otherwise fall back to original
            let pathForShortUrl = finalStoragePath || storagePath;
            let thumbnailPath = null;

            if (!pathForShortUrl) {
              // Try to get storage_path and thumbnail_path from the videos table
              const { data: videoRecord } = await supabase
                .from('videos')
                .select('storage_path, thumbnail_path')
                .eq('id', videoId)
                .maybeSingle();

              if (videoRecord?.storage_path) {
                pathForShortUrl = videoRecord.storage_path;
                console.log('📁 Found storage_path in video record:', pathForShortUrl);
              }
              if (videoRecord?.thumbnail_path) {
                thumbnailPath = videoRecord.thumbnail_path;
                console.log('🖼️ Found thumbnail_path in video record:', thumbnailPath);
              }
            }

            if (pathForShortUrl) {
              const shortUrlResult = await createShortVideoUrl(videoId, parentId, pathForShortUrl, {
                thumbnailPath: thumbnailPath,
              });
              shareUrl = shortUrlResult.shortUrl;
              console.log('✅ Short URL generated:', shareUrl);
            } else {
              // Generate a fresh signed URL as fallback
              console.log('⚠️ No storage_path found, generating fresh signed URL...');
              const { data: videoRecord } = await supabase
                .from('videos')
                .select('video_url')
                .eq('id', videoId)
                .maybeSingle();

              // Try to extract path from stored URL and regenerate
              if (videoRecord?.video_url) {
                // Use the short URL base with just the videoId as fallback
                shareUrl = `https://showthx.com/v/${videoId}`;
                console.log('⚠️ Using video ID as fallback URL:', shareUrl);
              }
            }
          } catch (shortUrlError) {
            console.warn('⚠️ Could not generate short URL:', shortUrlError.message);
            // Don't fall back to expired URL - show error
            throw new Error('Could not generate share link. Please try again.');
          }
        } else {
          throw new Error('Missing video information for sharing. Please go back and try again.');
        }

        setLoadingMessage('Opening share sheet...');

        // Open native share sheet - use email template message instead of gift name (which may have private notes)
        // Mirror the email template for consistency and privacy
        const selectedGuestNames = selectedGuestData.map(g => g.name).join(', ') || 'you';
        const shareSubject = (editedSubject || emailTemplate.subject)
          .replace('[name]', selectedGuestNames)
          .replace('[child_name]', childName || 'Your child')
          .replace('[gift_name]', 'your gift');  // Don't expose actual gift details
        const shareBody = (editedMessage || emailTemplate.message)
          .replace('[name]', selectedGuestNames)
          .replace('[child_name]', childName || 'Someone special')
          .replace('[gift_name]', 'your gift');  // Privacy: don't expose gift field
        const shareMessage = `${shareSubject}\n\n${shareBody}\n\nWatch here: ${shareUrl}`;

        try {
          // Note: URL is already in shareMessage, don't pass separately to avoid duplicate links on iOS
          const result = await Share.share({
            message: shareMessage,
            title: shareSubject,  // Use email template subject (privacy: don't expose gift field)
          });

          if (result.action === Share.dismissedAction) {
            // User dismissed the share sheet
            setLoading(false);
            setLoadingMessage('');
            return;
          }
        } catch (shareError) {
          console.error('Share error:', shareError);
          throw new Error('Failed to open share sheet');
        }
      }

      // Update gift status to 'sent' (only update status, other columns may not exist)
      const { error } = await updateGift(giftId, {
        status: 'sent',
      });

      if (error) {
        // Log but don't throw - email was already sent successfully
        console.warn('⚠️ Error updating gift status (email was sent successfully):', error);
      } else {
        console.log('✅ Gift status updated to sent');
      }

      // Also update video status to 'sent'
      const { error: videoError } = await supabase
        .from('videos')
        .update({ status: 'sent' })
        .eq('gift_id', giftId)
        .eq('status', 'approved');

      if (videoError) {
        console.warn('⚠️ Error updating video status:', videoError);
      } else {
        console.log('✅ Video status updated to sent');
      }

      // Navigate to success
      navigation?.navigate('SendSuccess', {
        giftName,
        guestCount: selectedGuests.size,
        sendMethod,
      });
    } catch (error) {
      console.error('❌ Error sending to guests:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      alert(`Failed to send videos: ${error.message || error}`);
      setLoading(false);
    }
  };

  const renderGuestCard = ({ item }) => {
    const isSelected = selectedGuests.has(item.id);

    return (
      <TouchableOpacity
        onPress={() => toggleGuestSelection(item.id)}
        style={{
          backgroundColor: isSelected ? theme.brandColors.coral : theme.neutralColors.white,
          borderColor: isSelected ? theme.brandColors.coral : theme.neutralColors.lightGray,
          borderWidth: 2,
          borderRadius: 8,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.sm,
          marginHorizontal: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Ionicons
            name="person-circle"
            size={40}
            color={isSelected ? '#FFFFFF' : theme.brandColors.teal}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                color: isSelected ? '#FFFFFF' : theme.neutralColors.dark,
              }}
            >
              {item.name}
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 10,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: isSelected ? 'rgba(255,255,255,0.8)' : theme.neutralColors.mediumGray,
                marginTop: 2,
              }}
            >
              {item.email}
            </Text>
          </View>
        </View>

        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: isSelected ? '#FFFFFF' : theme.neutralColors.lightGray,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={16} color={theme.brandColors.coral} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Share with Guests"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      <ScrollView style={{ flex: 1 }}>
        {/* Gift Info */}
        <View style={{ marginHorizontal: theme.spacing.md, marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
          <Text
            style={{
              fontSize: isKidsEdition ? 16 : 14,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.mediumGray,
              marginBottom: theme.spacing.sm,
            }}
          >
            Thank you video for
          </Text>
          <Text
            style={{
              fontSize: isKidsEdition ? 24 : 20,
              fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
              color: theme.neutralColors.dark,
            }}
          >
            {giftName}
          </Text>
        </View>

        {/* Send Method Selector */}
        <View
          style={{
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <Text
            style={{
              fontSize: isKidsEdition ? 14 : 12,
              fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
              color: theme.neutralColors.dark,
              marginBottom: theme.spacing.sm,
            }}
          >
            Send via
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <TouchableOpacity
              onPress={() => setSendMethod('email')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: theme.spacing.md,
                borderRadius: 8,
                backgroundColor: sendMethod === 'email' ? theme.brandColors.coral : theme.neutralColors.lightGray,
                borderWidth: 2,
                borderColor: sendMethod === 'email' ? theme.brandColors.coral : 'transparent',
              }}
            >
              <Ionicons
                name="mail"
                size={20}
                color={sendMethod === 'email' ? '#FFFFFF' : theme.neutralColors.mediumGray}
              />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: sendMethod === 'email' ? '#FFFFFF' : theme.neutralColors.dark,
                }}
              >
                Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSendMethod('share')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: theme.spacing.md,
                borderRadius: 8,
                backgroundColor: sendMethod === 'share' ? theme.brandColors.teal : theme.neutralColors.lightGray,
                borderWidth: 2,
                borderColor: sendMethod === 'share' ? theme.brandColors.teal : 'transparent',
              }}
            >
              <Ionicons
                name="share-outline"
                size={20}
                color={sendMethod === 'share' ? '#FFFFFF' : theme.neutralColors.mediumGray}
              />
              <Text
                style={{
                  fontSize: isKidsEdition ? 14 : 12,
                  fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                  color: sendMethod === 'share' ? '#FFFFFF' : theme.neutralColors.dark,
                }}
              >
                Share another way
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email Editor Section */}
          {sendMethod === 'email' && (
            <View
              style={{
                marginTop: theme.spacing.md,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.brandColors.teal,
                borderRadius: 12,
                backgroundColor: '#f0fdfa',
              }}
            >
              {/* From info */}
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.mediumGray,
                  marginBottom: theme.spacing.sm,
                }}
              >
                From: {childName && parentName ? `${childName} and ${parentName}` : childName || parentName || 'ShowThx'} via ShowThx
              </Text>

              {/* Subject input */}
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginBottom: 4,
                }}
              >
                Subject:
              </Text>
              <TextInput
                value={editedSubject}
                onChangeText={setEditedSubject}
                placeholder="Email subject..."
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: theme.neutralColors.lightGray,
                  borderRadius: 8,
                  padding: theme.spacing.md,
                  fontSize: 16,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.dark,
                  marginBottom: theme.spacing.md,
                }}
                placeholderTextColor={theme.neutralColors.mediumGray}
                autoCorrect={true}
                autoCapitalize="sentences"
                spellCheck={true}
              />

              {/* Message input */}
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                  color: theme.neutralColors.dark,
                  marginBottom: 4,
                }}
              >
                Message:
              </Text>
              <TextInput
                value={editedMessage}
                onChangeText={setEditedMessage}
                placeholder="Your personalized message..."
                multiline
                numberOfLines={6}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: theme.neutralColors.lightGray,
                  borderRadius: 8,
                  padding: theme.spacing.md,
                  fontSize: 16,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.dark,
                  minHeight: 150,
                  textAlignVertical: 'top',
                  marginBottom: theme.spacing.sm,
                }}
                placeholderTextColor={theme.neutralColors.mediumGray}
                autoCorrect={true}
                autoCapitalize="sentences"
                spellCheck={true}
              />

              {/* Mail merge hint */}
              <View
                style={{
                  backgroundColor: '#FEF3C7',
                  borderRadius: 6,
                  padding: 8,
                  marginBottom: theme.spacing.sm,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                    color: '#92400E',
                    lineHeight: 16,
                  }}
                >
                  Placeholders: <Text style={{ fontWeight: '700' }}>[name]</Text> = guest name, <Text style={{ fontWeight: '700' }}>[child_name]</Text> = {childName || 'your child'}, <Text style={{ fontWeight: '700' }}>[gift_name]</Text> = {giftName || 'gift'}
                </Text>
              </View>

              {/* Preview button */}
              <TouchableOpacity
                onPress={() => setShowEmailPreview(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: theme.spacing.sm,
                  borderWidth: 1,
                  borderColor: theme.brandColors.teal,
                  borderRadius: 8,
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Ionicons name="eye-outline" size={18} color={theme.brandColors.teal} />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                    color: theme.brandColors.teal,
                    marginLeft: 6,
                  }}
                >
                  Preview Email
                </Text>
              </TouchableOpacity>

              {/* Note about one-time edits */}
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                  color: theme.neutralColors.mediumGray,
                  textAlign: 'center',
                  marginTop: 8,
                  fontStyle: 'italic',
                }}
              >
                Edits here are for this send only. To change the default, edit the event.
              </Text>
            </View>
          )}
        </View>

        {/* Select All Option */}
        <View
          style={{
            backgroundColor: theme.neutralColors.lightGray,
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            borderRadius: 8,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_SemiBold',
                color: theme.neutralColors.dark,
              }}
            >
              Select All Guests
            </Text>
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 10,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
              }}
            >
              {selectedGuests.size} of {guests.length} selected
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSelectAll}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: selectedGuests.size === guests.length ? theme.brandColors.coral : '#FFFFFF',
              borderWidth: 2,
              borderColor: theme.brandColors.coral,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {selectedGuests.size === guests.length && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Guests List */}
        {fetchingGuests ? (
          <View style={{ paddingVertical: theme.spacing.xl, justifyContent: 'center', alignItems: 'center' }}>
            <LoadingSpinner visible={true} message="Loading guests..." />
          </View>
        ) : guests.length > 0 ? (
          <FlatList
            data={guests}
            renderItem={renderGuestCard}
            keyExtractor={item => item.id}
            scrollEnabled
            nestedScrollEnabled={true}
            contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
          />
        ) : (
          <View style={{ paddingVertical: theme.spacing.xl, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="people" size={40} color={theme.neutralColors.lightGray} />
            <Text
              style={{
                fontSize: isKidsEdition ? 14 : 12,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                marginTop: theme.spacing.md,
              }}
            >
              No guests added yet. Add guests from the event page.
            </Text>
          </View>
        )}

        {/* Info Box */}
        {guests.length > 0 && (
          <View
            style={{
              marginHorizontal: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              backgroundColor: 'rgba(0, 166, 153, 0.1)',
              borderRadius: 8,
              padding: theme.spacing.md,
              flexDirection: 'row',
              gap: theme.spacing.sm,
            }}
          >
            <Ionicons name="mail" size={20} color={theme.brandColors.teal} />
            <Text
              style={{
                fontSize: isKidsEdition ? 12 : 11,
                fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                color: theme.neutralColors.mediumGray,
                flex: 1,
              }}
            >
              Each guest will receive an email with a link to watch the thank you video.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {guests.length > 0 && (
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
            title={`Send to ${selectedGuests.size} Guest${selectedGuests.size !== 1 ? 's' : ''}`}
            onPress={handleSendToGuests}
            loading={loading}
            disabled={loading || selectedGuests.size === 0}
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
      )}

      <LoadingSpinner visible={loading} message={loadingMessage || "Sending videos..."} fullScreen />

      {/* Email Preview Modal */}
      <Modal
        visible={showEmailPreview}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmailPreview(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: theme.spacing.md,
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                maxHeight: '85%',
                overflow: 'hidden',
              }}
            >
              {/* Modal Header */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: theme.spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.neutralColors.lightGray,
                  backgroundColor: theme.brandColors.teal,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                    color: '#FFFFFF',
                  }}
                >
                  Email Preview
                </Text>
                <TouchableOpacity onPress={() => setShowEmailPreview(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Preview Content */}
              <ScrollView style={{ padding: theme.spacing.md }}>
                {/* Sample guest note */}
                <View
                  style={{
                    backgroundColor: '#FEF3C7',
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: '#92400E',
                      textAlign: 'center',
                    }}
                  >
                    Preview using sample guest: "{guests.length > 0 ? guests[0].name : 'Guest Name'}"
                  </Text>
                </View>

                {/* Email From */}
                <View style={{ marginBottom: theme.spacing.md }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                      color: theme.neutralColors.mediumGray,
                      marginBottom: 4,
                    }}
                  >
                    FROM:
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: isKidsEdition ? 'Nunito_Regular' : 'Montserrat_Regular',
                      color: theme.neutralColors.dark,
                    }}
                  >
                    {childName && parentName ? `${childName} and ${parentName}` : childName || parentName || 'ShowThx'} via ShowThx
                  </Text>
                </View>

                {/* Email Subject */}
                <View style={{ marginBottom: theme.spacing.md }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: isKidsEdition ? 'Nunito_SemiBold' : 'Montserrat_SemiBold',
                      color: theme.neutralColors.mediumGray,
                      marginBottom: 4,
                    }}
                  >
                    SUBJECT:
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: isKidsEdition ? 'Nunito_Bold' : 'Montserrat_Bold',
                      color: theme.neutralColors.dark,
                    }}
                  >
                    {(editedSubject || emailTemplate.subject)
                      .replace(/\[name\]/gi, guests.length > 0 ? guests[0].name : 'Guest Name')
                      .replace(/\[guest_name\]/gi, guests.length > 0 ? guests[0].name : 'Guest Name')
                      .replace(/\[child_name\]/gi, childName || 'Your Child')
                      .replace(/\[gift_name\]/gi, giftName || 'Gift')
                      .replace(/\[parent_name\]/gi, parentName || 'Parent')}
                  </Text>
                </View>

                {/* Divider */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: theme.neutralColors.lightGray,
                    marginVertical: theme.spacing.md,
                  }}
                />

                {/* Email Body Preview (styled like actual email) */}
                <View
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 12,
                    padding: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: theme.neutralColors.lightGray,
                  }}
                >
                  {/* Hashtag */}
                  <Text
                    style={{
                      color: theme.brandColors.teal,
                      fontWeight: 'bold',
                      fontSize: 12,
                      marginBottom: theme.spacing.md,
                    }}
                  >
                    #REELYTHANKFUL
                  </Text>

                  {/* Message */}
                  <Text
                    style={{
                      fontSize: 14,
                      lineHeight: 22,
                      color: '#333',
                      marginBottom: theme.spacing.md,
                    }}
                  >
                    {(editedMessage || emailTemplate.message)
                      .replace(/\[name\]/gi, guests.length > 0 ? guests[0].name : 'Guest Name')
                      .replace(/\[guest_name\]/gi, guests.length > 0 ? guests[0].name : 'Guest Name')
                      .replace(/\[child_name\]/gi, childName || 'Your Child')
                      .replace(/\[gift_name\]/gi, giftName || 'Gift')
                      .replace(/\[parent_name\]/gi, parentName || 'Parent')}
                  </Text>

                  {/* Watch Video button preview */}
                  <View
                    style={{
                      backgroundColor: theme.brandColors.teal,
                      paddingVertical: 14,
                      paddingHorizontal: 32,
                      borderRadius: 12,
                      alignSelf: 'center',
                      marginVertical: theme.spacing.md,
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontWeight: 'bold',
                        fontSize: 16,
                      }}
                    >
                      Watch the Video
                    </Text>
                  </View>

                  {/* Expiry note */}
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#666',
                      marginTop: theme.spacing.sm,
                    }}
                  >
                    <Text style={{ fontWeight: 'bold' }}>Note:</Text> This link expires in 30 days.
                  </Text>

                  {/* Footer */}
                  <View
                    style={{
                      marginTop: theme.spacing.lg,
                      paddingTop: theme.spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: '#eee',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: '#999' }}>
                      Sent with love via ShowThx
                    </Text>
                  </View>
                </View>

                {/* Padding at bottom */}
                <View style={{ height: theme.spacing.xl }} />
              </ScrollView>

              {/* Modal Footer */}
              <View
                style={{
                  padding: theme.spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: theme.neutralColors.lightGray,
                }}
              >
                <TouchableOpacity
                  onPress={() => setShowEmailPreview(false)}
                  style={{
                    backgroundColor: theme.brandColors.teal,
                    paddingVertical: theme.spacing.md,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontWeight: 'bold',
                      fontSize: 14,
                    }}
                  >
                    Close Preview
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SendToGuestsScreen;
