/**
 * Video Service
 * Handles video upload, storage, and retrieval via Supabase Storage
 */

import { supabase } from '../supabaseClient';
import * as FileSystem from 'expo-file-system/legacy';

const VIDEOS_BUCKET = 'videos';
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Upload video to Supabase Storage
 */
export const uploadVideo = async (videoUri, giftId, parentId) => {
  try {
    console.log('📤 Starting video upload...', { videoUri, giftId, parentId });

    // Validate inputs
    if (!videoUri || !giftId || !parentId) {
      throw new Error('Missing required parameters for upload');
    }

    // Read file as base64
    const base64Data = await FileSystem.readAsStringAsync(videoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('📁 Read file, size:', Math.round(base64Data.length / 1024), 'KB (base64)');

    // Create file path
    const timestamp = Date.now();
    const filename = `${parentId}/${giftId}/${timestamp}.mp4`;

    // Convert base64 to Uint8Array for upload
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('📤 Uploading to Supabase Storage:', filename);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(VIDEOS_BUCKET)
      .upload(filename, bytes.buffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw error;
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(VIDEOS_BUCKET)
      .getPublicUrl(filename);

    console.log('🔗 Video URL:', urlData.publicUrl);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filename,
    };
  } catch (error) {
    console.error('❌ Error uploading video:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Delete video from Supabase Storage
 */
export const deleteVideo = async (videoPath) => {
  try {
    const { error } = await supabase.storage
      .from(VIDEOS_BUCKET)
      .remove([videoPath]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting video:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create signed URL for video (private share)
 */
export const createSignedUrl = async (videoPath, expiresIn = 86400) => {
  try {
    const { data, error } = await supabase.storage
      .from(VIDEOS_BUCKET)
      .createSignedUrl(videoPath, expiresIn);

    if (error) throw error;
    return { url: data.signedUrl, error: null };
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return { url: null, error: error.message };
  }
};

/**
 * Get video download URL
 */
export const getVideoUrl = async (videoPath) => {
  try {
    const { data } = supabase.storage
      .from(VIDEOS_BUCKET)
      .getPublicUrl(videoPath);

    return { url: data.publicUrl, error: null };
  } catch (error) {
    console.error('Error getting video URL:', error);
    return { url: null, error: error.message };
  }
};

/**
 * Validate video before upload
 */
export const validateVideo = async (videoUri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(videoUri);

    if (!fileInfo.exists) {
      return { valid: false, error: 'Video file does not exist' };
    }

    if (fileInfo.size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: `Video exceeds max size of ${MAX_VIDEO_SIZE / 1024 / 1024}MB`,
      };
    }

    return { valid: true, size: fileInfo.size };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

export default {
  uploadVideo,
  deleteVideo,
  createSignedUrl,
  getVideoUrl,
  validateVideo,
};
