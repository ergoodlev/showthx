/**
 * Video Upload Service
 *
 * Client-side service for uploading videos to Supabase
 * Handles COPPA-compliant video storage with:
 * - Secure upload to cloud storage
 * - Time-limited signed URLs (24 hours default)
 * - Automatic expiry tracking
 */

import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { supabase } from '../supabaseClient';

// Get Supabase URL from config
const SUPABASE_URL = Constants.expoConfig?.extra?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || '';

/**
 * Upload video via Edge Function (preferred method)
 *
 * @param {string} videoUri - Local video file URI
 * @param {string} giftId - Gift ID to associate video with
 * @param {object} options - Processing options
 * @returns {Promise<{success: boolean, videoUrl?: string, error?: string}>}
 */
export const uploadVideoViaEdgeFunction = async (videoUri, giftId, options = {}) => {
  try {
    const {
      childId = null,
      musicUrl = null,
      frameData = null,
      expiresInHours = 24,
    } = options;

    console.log(`[VideoUpload] Starting Edge Function upload for gift: ${giftId}`);

    // Read video file as base64
    const videoBase64 = await FileSystem.readAsStringAsync(videoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log(`[VideoUpload] Video size: ${Math.round(videoBase64.length / 1024)} KB`);

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token || SUPABASE_ANON_KEY;

    // Call Edge Function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        videoBase64,
        giftId,
        childId,
        musicUrl,
        frameData,
        expiresInHours,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[VideoUpload] Edge Function failed:', result);
      // Fall back to direct upload
      console.log('[VideoUpload] Falling back to direct upload...');
      return await uploadVideoDirect(videoUri, giftId, expiresInHours);
    }

    console.log(`[VideoUpload] Success! Video expires at: ${result.expiresAt}`);

    return {
      success: true,
      videoUrl: result.videoUrl,
      videoPath: result.videoPath,
      expiresAt: result.expiresAt,
    };

  } catch (error) {
    console.error('[VideoUpload] Error:', error);
    // Fall back to direct upload on any error
    console.log('[VideoUpload] Falling back to direct upload due to error...');
    return await uploadVideoDirect(videoUri, giftId, options.expiresInHours || 24);
  }
};

/**
 * Upload video directly to Supabase Storage (fallback method)
 *
 * @param {string} videoUri - Local video file URI
 * @param {string} giftId - Gift ID to associate video with
 * @param {number} expiresInHours - Hours until video link expires
 * @returns {Promise<{success: boolean, videoUrl?: string, error?: string}>}
 */
export const uploadVideoDirect = async (videoUri, giftId, expiresInHours = 24) => {
  try {
    console.log(`[VideoUpload Direct] Starting upload for gift: ${giftId}`);
    console.log(`[VideoUpload Direct] Video URI: ${videoUri}`);

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[VideoUpload Direct] No active session - user must be logged in');
      return {
        success: false,
        error: 'You must be logged in to upload videos. Please log in and try again.',
      };
    }
    console.log(`[VideoUpload Direct] User authenticated: ${session.user.id}`);

    // Read video file
    console.log('[VideoUpload Direct] Reading video file...');
    const videoBase64 = await FileSystem.readAsStringAsync(videoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`[VideoUpload Direct] Video read successfully, size: ${Math.round(videoBase64.length / 1024)} KB`);

    // Convert base64 to ArrayBuffer then to Uint8Array
    const binaryString = atob(videoBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename with expiry tracking
    const timestamp = Date.now();
    const expiryTimestamp = timestamp + (expiresInHours * 60 * 60 * 1000);
    const fileName = `thank-you-videos/${giftId}/${timestamp}.mp4`;

    console.log(`[VideoUpload Direct] Uploading to bucket 'videos', path: ${fileName}`);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, bytes.buffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error('[VideoUpload Direct] Upload error:', uploadError);
      console.error('[VideoUpload Direct] Error code:', uploadError.statusCode);
      console.error('[VideoUpload Direct] Error details:', JSON.stringify(uploadError));

      // Provide helpful error messages
      let errorMessage = uploadError.message;
      if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('policy')) {
        errorMessage = 'Upload permission denied. Please run the video storage RLS migration in Supabase. Check supabase/migrations/20241123_fix_video_storage_rls.sql';
      } else if (uploadError.message?.includes('bucket') || uploadError.statusCode === 404) {
        errorMessage = 'Video storage bucket not found. Please create a "videos" bucket in Supabase Storage.';
      } else if (uploadError.message?.includes('size') || uploadError.statusCode === 413) {
        errorMessage = 'Video file is too large. Please record a shorter video.';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    console.log('[VideoUpload Direct] Video uploaded:', uploadData.path);

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('videos')
      .createSignedUrl(fileName, expiresInHours * 60 * 60);

    if (signedUrlError) {
      console.error('[VideoUpload Direct] Signed URL error:', signedUrlError);
      return {
        success: false,
        error: signedUrlError.message,
      };
    }

    // Update gift record
    const { error: updateError } = await supabase
      .from('gifts')
      .update({
        video_url: signedUrlData.signedUrl,
        video_path: fileName,
        video_expires_at: new Date(expiryTimestamp).toISOString(),
        status: 'pending_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', giftId);

    if (updateError) {
      console.error('[VideoUpload Direct] Gift update error:', updateError);
      // Don't fail, video is still uploaded
    }

    return {
      success: true,
      videoUrl: signedUrlData.signedUrl,
      videoPath: fileName,
      expiresAt: new Date(expiryTimestamp).toISOString(),
    };

  } catch (error) {
    console.error('[VideoUpload Direct] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload video',
    };
  }
};

/**
 * Main upload function - tries Edge Function first, falls back to direct upload
 *
 * @param {string} videoUri - Local video file URI
 * @param {string} giftId - Gift ID to associate video with
 * @param {object} options - Upload options
 * @returns {Promise<{success: boolean, videoUrl?: string, error?: string}>}
 */
export const uploadVideo = async (videoUri, giftId, options = {}) => {
  // If Edge Functions are configured, try them first
  if (SUPABASE_URL && SUPABASE_URL.length > 0) {
    return await uploadVideoViaEdgeFunction(videoUri, giftId, options);
  }

  // Otherwise, direct upload
  return await uploadVideoDirect(videoUri, giftId, options.expiresInHours || 24);
};

/**
 * Check if video URL is still valid
 *
 * @param {string} videoUrl - Video URL to check
 * @returns {Promise<boolean>} - True if video is accessible
 */
export const isVideoUrlValid = async (videoUrl) => {
  try {
    if (!videoUrl) return false;

    const response = await fetch(videoUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get remaining time until video expires
 *
 * @param {string} expiresAt - ISO date string of expiry time
 * @returns {object} - { expired, hoursRemaining, formattedRemaining }
 */
export const getVideoExpiryStatus = (expiresAt) => {
  if (!expiresAt) {
    return { expired: true, hoursRemaining: 0, formattedRemaining: 'Expired' };
  }

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry - now;

  if (diffMs <= 0) {
    return { expired: true, hoursRemaining: 0, formattedRemaining: 'Expired' };
  }

  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let formattedRemaining;
  if (hoursRemaining >= 24) {
    const days = Math.floor(hoursRemaining / 24);
    formattedRemaining = `${days} day${days > 1 ? 's' : ''} remaining`;
  } else if (hoursRemaining > 0) {
    formattedRemaining = `${hoursRemaining}h ${minutesRemaining}m remaining`;
  } else {
    formattedRemaining = `${minutesRemaining} minutes remaining`;
  }

  return {
    expired: false,
    hoursRemaining,
    minutesRemaining,
    formattedRemaining,
  };
};

/**
 * Request a new video link (regenerate signed URL)
 *
 * @param {string} videoPath - Storage path of the video
 * @param {number} expiresInHours - Hours until new URL expires
 * @returns {Promise<{success: boolean, videoUrl?: string, error?: string}>}
 */
export const regenerateVideoUrl = async (videoPath, expiresInHours = 24) => {
  try {
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(videoPath, expiresInHours * 60 * 60);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      videoUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + (expiresInHours * 60 * 60 * 1000)).toISOString(),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete a video from storage
 *
 * @param {string} videoPath - Storage path of the video
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteVideo = async (videoPath) => {
  try {
    const { error } = await supabase.storage
      .from('videos')
      .remove([videoPath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default {
  uploadVideo,
  uploadVideoDirect,
  uploadVideoViaEdgeFunction,
  isVideoUrlValid,
  getVideoExpiryStatus,
  regenerateVideoUrl,
  deleteVideo,
};
